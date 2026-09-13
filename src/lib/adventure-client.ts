import type { AdventureGame } from '../game/adventure';
import { learningTopic, learningText, type LearningTopic } from '../data/singapore-guide';

export function createAdventureClient(game: AdventureGame, fetcher: typeof fetch = (...args) => fetch(...args), onLearning: (topic: LearningTopic | null) => void = () => {}) {
  let sequence = 0, controller: AbortController | undefined;
  return {
    cancel() { sequence++; controller?.abort(); game.cancel(); },
    async send(text: string, signal?: AbortSignal): Promise<string | null> {
      if (signal?.aborted) return null;
      controller?.abort(); controller = new AbortController();
      const current = ++sequence, ticket = game.begin();
      try {
        const response = await fetcher('/api/adventure/change', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, state: ticket.snapshot }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000), ...(signal ? [signal] : [])]),
        });
        if (current !== sequence || signal?.aborted) return null;
        if (!response.ok) {
          if (response.status === 422) throw new Error('I can help with Singapore facts and game objectives, but not instruction overrides or secret requests. Your objective is unchanged.');
          if (response.status === 429) throw new Error('The companion is busy or you have sent too many requests. Wait a minute and try again. Your objective is unchanged.');
          if (response.status === 400 || response.status === 413) throw new Error('Please send a short, plain-text question about the game or Singapore. If this continues, reload the game. Your objective is unchanged.');
          if (response.status === 404) throw new Error('The companion API was not found. Restart pnpm dev and pnpm server; a static-only host cannot run the companion. Your objective is unchanged.');
          if (response.status === 503) throw new Error('The companion is unavailable or disabled. The operator can check OPENAI_API_KEY and the server settings. You can keep exploring.');
          throw new Error('The companion could not process that request. Your objective is unchanged; try again.');
        }
        const body = await response.json();
        if (current !== sequence || signal?.aborted) return null;
        if (body.decision?.intent === 'learn') {
          const now = game.read();
          if (now.sessionId !== ticket.snapshot.sessionId || now.revision !== ticket.snapshot.revision || now.region !== ticket.snapshot.region) return null;
          if (body.decision.destinationId !== null) throw new Error('Invalid learning response. Your objective is unchanged.');
          const topic = learningTopic(body.decision.topicId);
          if (!topic && body.decision.topicId !== null) throw new Error('Unknown learning topic. Your objective is unchanged.');
          onLearning(topic ?? null);
          return topic ? learningText(topic, now.region !== 'marina-bay') : 'I don’t have verified information for that question yet. Ask about Marina Bay, the museum, SkyPark, Gardens by the Bay, Esplanade, the Flyer, Raffles Place or Queenstown. Check the official venue website for current hours, prices and exhibitions. Your progress is unchanged.';
        }
        return game.apply(ticket, body.decision).message;
      } catch (error) {
        if (current !== sequence || signal?.aborted) return null;
        throw error instanceof Error && error.name !== 'TimeoutError' ? error : new Error('Request timed out. You can keep exploring or try again.');
      }
    },
  };
}
