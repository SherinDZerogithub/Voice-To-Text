const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'have',
  'has',
  'how',
  'i',
  'if',
  'im',
  'in',
  'is',
  'it',
  'ive',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'so',
  'that',
  'the',
  'their',
  'them',
  'there',
  'they',
  'this',
  'to',
  'was',
  'we',
  'what',
  'when',
  'why',
  'with',
  'you',
  'your',
]);

const MAX_CACHE_ENTRIES = 40;

const stemWord = word => {
  if (word.length > 5 && word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.length > 6 && word.endsWith('ing')) {
    return word.slice(0, -3);
  }
  if (word.length > 5 && word.endsWith('ed')) {
    return word.slice(0, -2);
  }
  return word;
};

export const promptWords = text => {
  const words = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(stemWord)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));

  return [...new Set(words)];
};

const contextKey = vibe => promptWords(vibe).sort().join('|');

const makeEntry = (prompt, vibe, response) => {
  const words = promptWords(prompt);
  return {
    key: [...words].sort().join('|'),
    words,
    context: contextKey(vibe),
    response,
  };
};

const isEquivalentPrompt = (requestedWords, cachedWords) => {
  if (!requestedWords.length || !cachedWords.length) {
    return false;
  }

  const requested = new Set(requestedWords);
  const cached = new Set(cachedWords);
  const shared = [...requested].filter(word => cached.has(word)).length;
  const shorter = Math.min(requested.size, cached.size);
  const longer = Math.max(requested.size, cached.size);

  // Reordered prompts have the same key. This also supports a shorter form
  // such as “feel anxious” matching “I have been feeling anxious lately”.
  if (shared === shorter && shorter >= 2 && longer - shorter <= 3) {
    return true;
  }

  // Allow small wording differences without treating a single broad word as
  // a match for every prompt containing that word.
  return (
    shared / (requested.size + cached.size - shared) >= 0.75 && shorter >= 3
  );
};

export const rememberPromptResponse = (cache, prompt, vibe, response) => {
  if (!response || !promptWords(prompt).length) {
    return;
  }

  const entry = makeEntry(prompt, vibe, response);
  const existingIndex = cache.findIndex(
    item => item.context === entry.context && item.key === entry.key,
  );

  if (existingIndex >= 0) {
    cache.splice(existingIndex, 1);
  }
  cache.unshift(entry);
  cache.splice(MAX_CACHE_ENTRIES);
};

export const findPromptResponse = (cache, prompt, vibe) => {
  const requestedWords = promptWords(prompt);
  if (!requestedWords.length) {
    return null;
  }

  const requestedKey = [...requestedWords].sort().join('|');
  const requestedContext = contextKey(vibe);
  const exact = cache.find(
    item => item.context === requestedContext && item.key === requestedKey,
  );
  if (exact) {
    return exact.response;
  }

  const equivalent = cache.find(
    item =>
      item.context === requestedContext &&
      isEquivalentPrompt(requestedWords, item.words),
  );
  return equivalent ? equivalent.response : null;
};

export const cacheResponsesFromHistory = (cache, messages, vibe) => {
  for (let index = 0; index < messages.length - 1; index += 1) {
    const userMessage = messages[index];
    const modelMessage = messages[index + 1];
    if (userMessage.role === 'user' && modelMessage.role === 'model') {
      rememberPromptResponse(cache, userMessage.text, vibe, modelMessage.text);
    }
  }
};
