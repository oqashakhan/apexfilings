# Apex Filings website translations

English is the source language. The public site renders English first and translates visible page text, headings, link labels, form labels and placeholders, and dynamically opened content after a visitor chooses another language. Routes, form values, pricing calculations, and SEO metadata remain in their original implementation. Arabic and Urdu use right-to-left page direction.

## Configure the provider

Enable Google Cloud Translation API for the project, create an API key restricted to that API, and set `GOOGLE_TRANSLATE_API_KEY` in the Netlify site's environment variables. Redeploy after saving it. For local development, put the same variable in an untracked `.env` file and restart `npm run dev`. Never use a `VITE_` prefix: Vite would expose such a value in the browser bundle. The browser calls `/api/translate`; the Netlify Function (or local Vite middleware) calls the provider. When no key is configured or a request fails, the selection returns to English with a visible status message.

Set appropriate Google Cloud API quota and budget controls before enabling production traffic. The server limits each translation request to 50 strings and 18,000 characters. Translated public text is cached for the browser session to avoid repeating requests.

## Review and override copy

Machine translation is provisional, particularly for legal, pricing, and compliance wording. Add approved replacements to `src/i18n/approvedTranslations.ts` under the language code, keyed by the exact English source string. Those entries always override machine translations and the session cache. The legal pages display an English-authoritative notice and a switch back to the original. Review every legal translation before treating it as approved; the English policy remains authoritative.

The public translation does not create translated indexable routes or `hreflang` entries. Existing canonical URLs and metadata remain English, avoiding unsupported SEO claims until reviewed localized pages are available.
