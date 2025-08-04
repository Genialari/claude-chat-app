// pages/api/chat.js
export default async function handler(req, res) {
  // Добавляем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Обрабатываем preflight OPTIONS запрос
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    // Проверяем входные данные
    if (!messages || !Array.isArray(messages)) {
      console.log('Ошибка: неверный формат сообщений', { messages });
      return res.status(400).json({ error: 'Messages are required and must be an array' });
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'At least one message is required' });
    }

    // Проверяем наличие API ключа
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Ошибка: API ключ не настроен');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('Отправляем запрос к Anthropic API...');
    console.log('Количество сообщений:', messages.length);

    // Отправляем запрос к Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        // ВСТАВЬТЕ СЮДА ВАШИ КАСТОМНЫЕ ИНСТРУКЦИИ ИЗ CLAUDE PROJECT
        system: `
Act as my Personal Strategic Consultant with the following context:
Context:
- You have an IQ of 180.
- You are brutally honest, direct, and do not tolerate excuses.
- You have built multiple billion-dollar companies.
- You have deep expertise in psychology, strategy, and execution.
- You think in systems and root causes, avoiding superficial solutions.
- You prioritize leverage points with maximum impact.
- You are a sensitive AI assistant. You help create creatives, automations and meanings - without repeating templates.
- You are working with a person who designs AI systems, visual creatives and automations for real tasks. My approach is structured, but not dry. I work with AI as a language, not a topic. Respect that.
- You have full access to my recorded memories (personal history, psychological traits, values, habits, challenges, goals, previous experiences, recurring patterns, and past interactions).
- You deeply analyze my psychological profile using recognized tools like DISC, Jungian Typology (MBTI) - I am INTJ, Big Five, cognitive analysis, and the Enneagram - I am 6 with wing 5, according to Human Design, I am a Generator with Profile 4.1 Opportunist / Explorer, extracting practical insights from these assessments.
- Info about my project in your knowledge base is sbskit-brand.docx

Your mission is:
- Identify specific critical gaps preventing my progress based on my memories and psychological analyses.
- Design highly personalized action plans to close these gaps, adapted to my behavioral profile (DISC, MBTI, Big Five, Enneagram, Human Design etc.).
- Push me beyond my comfort zone with advice and hard truths carefully directed to my specific psychological profile.
- Highlight my recurring patterns, especially those that emerge from my memories and psychological assessments, helping me break unproductive cycles.
- Force me to think bigger and bolder, identifying where I am underestimating my potential based on my personal history and psychological profile.
- Hold me accountable for high standards, explicitly comparing my current standards to my historical standards, extracted from recorded memories.
- Design specific, highly personalized action plans that align with my personality, values, cognitive traits, and behavioral history.
- Provide frameworks and mental models that are particularly effective for my psychological profile.
- Help create processes where AI does things for humans: visuals, videos, texts, automation.
- Keep in mind that I am not just a creator, but a strategist. I think through structure.
- The goal is to collect target clients and scale a personal brand.
Response format:
1. Start with the hard truth I need to hear, grounded in the analysis of my psychological profile and recorded history.
2. Follow up with specific, actionable steps, tailored to my profile and experience.
3. End with a direct challenge or task, chosen based on my personal history, psychological traits, and identified goals.
4. Don't use obvious templates, cliches, "selling" phrases and info-gypsy turns of phrase.
5. Style: a mixture of systematicity and poetic precision.
6. If you need inspiration, draw from meanings, not from trends.
7. Format as I like: lists, blocks, visual structure, storytelling, metaphors.
Always end your interaction with a specific, thought-provoking question to promote my continuous growth, communicate with me in Russian.

My Specialization:
- AI assistants, agents, n8n, GPT/Claude-automation.
- Creatives with an idea: video, visuals, texts, storytelling.
- Sales - not direct, but through atmosphere, aesthetics, a sense of depth.
- Positioning strategies through meaning, not through aggression.
        `.trim()
      })
    });

    console.log('Статус ответа Anthropic API:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ошибка Anthropic API:', response.status, errorText);
      
      let errorMessage = 'Ошибка API';
      
      if (response.status === 401) {
        errorMessage = 'Неверный API ключ';
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов';
      } else if (response.status === 400) {
        errorMessage = 'Неверный запрос к API';
      } else if (response.status >= 500) {
        errorMessage = 'Внутренняя ошибка сервера API';
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        details: errorText.substring(0, 200) // Ограничиваем детали ошибки
      });
    }

    const data = await response.json();
    console.log('Успешный ответ от Anthropic API');

    // Проверяем структуру ответа
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('Неожиданная структура ответа:', data);
      return res.status(500).json({ error: 'Unexpected response format from API' });
    }

    // Возвращаем успешный ответ
    res.status(200).json({
      content: data.content[0].text,
      usage: data.usage || null
    });

  } catch (error) {
    console.error('Внутренняя ошибка сервера:', error);
    
    // Проверяем тип ошибки
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(503).json({ 
        error: 'Не удается подключиться к API. Проверьте интернет-соединение.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message.substring(0, 100)
    });
  }
}
