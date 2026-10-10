/**
 * AI Email Drafting Engine with Fact Validation Guardrails
 * Follows Section 7 of UniManage Spec:
 * - AI only writes wording & tone
 * - Must never invent numbers, grades or dates
 * - Validates output; rejects hallucinations and falls back to deterministic template
 * - Logs all usage in AIUsageLog
 */

const https = require('https');
const AIUsageLog = require('../models/AIUsageLog');

/**
 * Replace placeholders like {{firstName}}, {{courseName}} in template string
 */
function fillTemplate(template, facts) {
  return template.replace(/\{\{([\w]+)\}\}/g, (match, key) => {
    return facts[key] !== undefined ? String(facts[key]) : '';
  });
}

/**
 * Validate that all numbers present in the generated draft exist in the facts bundle.
 * Returns true if valid, false if a hallucinated number is detected.
 */
function validateNumbers(draftText, facts) {
  // Collect all numbers from facts (as strings)
  const factsNumbers = new Set();

  function collectNumbers(obj) {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'number') {
      factsNumbers.add(String(obj));
      factsNumbers.add(String(Math.round(obj)));
    } else if (typeof obj === 'string') {
      const nums = obj.match(/\b\d+(\.\d+)?\b/g) || [];
      nums.forEach(n => factsNumbers.add(n));
    } else if (Array.isArray(obj)) {
      obj.forEach(collectNumbers);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(collectNumbers);
    }
  }

  collectNumbers(facts);

  // Extract all numbers from generated text
  const draftNumbers = draftText.match(/\b\d+(\.\d+)?\b/g) || [];

  for (const num of draftNumbers) {
    // Allow standard single-digit numbers like "1" or "2" for grammar if < 5, but strictly verify percentages, marks, fees, and dates
    if (num.length >= 2 || parseFloat(num) >= 5) {
      if (!factsNumbers.has(num)) {
        return {
          valid: false,
          reason: `Hallucinated number detected: "${num}" was not found in verified facts bundle.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Main function: Drafts alert email using AI with strict validation and template fallback
 */
async function draftAlertEmail({ rule, facts, alertId = null }) {
  const fallbackSubject = fillTemplate(rule.fallbackSubjectTemplate, facts);
  const fallbackBody = fillTemplate(rule.fallbackBodyTemplate, facts);

  // If OpenAI is not configured, immediately use validated template
  if (!process.env.OPENAI_API_KEY) {
    return {
      subject: fallbackSubject,
      body: fallbackBody,
      isAiGenerated: false,
      validationPassed: true
    };
  }

  const startTime = Date.now();
  const tone = rule.tone || 'informative';
  const language = facts.language || 'en';

  // Build sanitized, minimal facts bundle (Least Data Principle)
  const sanitizedFacts = { ...facts };
  delete sanitizedFacts.studentId;
  delete sanitizedFacts.userId;
  delete sanitizedFacts.recipientId;

  const prompt = `You write short emails for a university portal.
Use ONLY the facts in the JSON below. Do not add numbers, dates or names.
Tone: ${tone}. Language: ${language}. Maximum 120 words.
End with one suggested next step and the text "View details in the portal."
Return JSON: {"subject": "...", "body": "..."}

FACTS:
${JSON.stringify(sanitizedFacts, null, 2)}`;

  try {
    const requestBody = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 220,
      temperature: 0.3 // Low temperature for high factual accuracy
    });

    const aiResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON from OpenAI'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy();
        reject(new Error('OpenAI timeout after 8s'));
      });

      req.write(requestBody);
      req.end();
    });

    const latencyMs = Date.now() - startTime;
    const rawContent = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!rawContent) throw new Error('Empty AI response');

    // Parse JSON output
    let parsed;
    try {
      // Find JSON block if wrapped in markdown
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      throw new Error('AI output was not valid JSON');
    }

    const subject = parsed.subject?.trim();
    const body = parsed.body?.trim();

    if (!subject || !body) throw new Error('Missing subject or body in AI output');

    // ── GUARDRAIL CHECK 1: Number Validation ──
    const validation = validateNumbers(`${subject} ${body}`, sanitizedFacts);

    // ── GUARDRAIL CHECK 2: Length limit ──
    const wordCount = body.split(/\s+/).length;
    const lengthValid = wordCount <= 160;

    const validationPassed = validation.valid && lengthValid;
    const rejectionReason = !validation.valid ? validation.reason : (!lengthValid ? 'Exceeded word limit' : null);

    // Log AI Usage
    if (aiResponse.usage) {
      await AIUsageLog.create({
        alert: alertId,
        ruleCode: rule.code,
        model: 'gpt-3.5-turbo',
        promptTokens: aiResponse.usage.prompt_tokens || 0,
        completionTokens: aiResponse.usage.completion_tokens || 0,
        totalTokens: aiResponse.usage.total_tokens || 0,
        estimatedCostUSD: ((aiResponse.usage.prompt_tokens || 0) * 0.0015 + (aiResponse.usage.completion_tokens || 0) * 0.002) / 1000,
        latencyMs,
        validationPassed,
        rejectionReason
      }).catch(err => console.error('Error saving AIUsageLog:', err.message));
    }

    if (!validationPassed) {
      console.warn(`[AI GUARDRAIL] Draft rejected for rule ${rule.code}: ${rejectionReason}. Using fallback template.`);
      return {
        subject: fallbackSubject,
        body: fallbackBody,
        isAiGenerated: false,
        validationPassed: false,
        rejectionReason
      };
    }

    return {
      subject,
      body,
      isAiGenerated: true,
      validationPassed: true
    };
  } catch (err) {
    console.warn(`[AI FALLBACK] AI drafting failed (${err.message}). Using fallback template.`);
    return {
      subject: fallbackSubject,
      body: fallbackBody,
      isAiGenerated: false,
      validationPassed: true
    };
  }
}

module.exports = {
  draftAlertEmail,
  fillTemplate,
  validateNumbers
};
