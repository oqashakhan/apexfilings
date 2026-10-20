import { handleTranslation } from '../../server/translate';

export default async function handler(request: Request): Promise<Response> {
  return handleTranslation(request, process.env.GOOGLE_TRANSLATE_API_KEY);
}
