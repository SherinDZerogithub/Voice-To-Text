import {
  findPromptResponse,
  rememberPromptResponse,
} from './therapistPromptCache';

describe('therapist prompt cache', () => {
  test('matches reordered wording', () => {
    const cache = [];
    rememberPromptResponse(
      cache,
      'I feel anxious and overwhelmed',
      null,
      'cached reply',
    );

    expect(findPromptResponse(cache, 'overwhelmed anxious feel', null)).toBe(
      'cached reply',
    );
  });

  test('matches a shorter version of the same prompt', () => {
    const cache = [];
    rememberPromptResponse(
      cache,
      'I have been feeling anxious lately',
      null,
      'cached reply',
    );

    expect(findPromptResponse(cache, 'feeling anxious', null)).toBe(
      'cached reply',
    );
  });

  test('does not reuse a response from a different mood context', () => {
    const cache = [];
    rememberPromptResponse(
      cache,
      'I feel anxious',
      'calm',
      'calm-context reply',
    );

    expect(findPromptResponse(cache, 'I feel anxious', 'sad')).toBeNull();
  });
});
