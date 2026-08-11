import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseDataUrl(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl || "");
  if (!match) throw new Error("Ungültiges Bildformat.");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST ist erlaubt." });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY fehlt in Vercel." });

  try {
    const { childImage, styleReference, name, style, model, color } = req.body || {};
    if (!childImage || !styleReference || !name || !style || !color) {
      return res.status(400).json({ error: "Foto, Design, Name oder Farbe fehlt." });
    }

    const child = parseDataUrl(childImage);
    const ref = parseDataUrl(styleReference);
    const images = [
      await toFile(child.buffer, "child.jpg", { type: child.mime }),
      await toFile(ref.buffer, "style-reference.jpg", { type: ref.mime })
    ];

    const prompt = `Create a polished photorealistic commercial KIDZ STYLE T-shirt mockup using the FIRST image as the identity/reference photo of the child and the SECOND image only as the visual style/composition reference.

CRITICAL IDENTITY RULES:
- Preserve the child's face, facial proportions, hairstyle, skin tone, apparent age, and recognizable identity from the first image as faithfully as possible.
- Do not replace the child with the model from the second image.
- Keep the result age-appropriate and natural.

DESIGN:
- Category/style: ${style}
- Selected catalog reference model: ${model} (reference for pose/design language only, never identity)
- T-shirt color: ${color}
- Put the exact name "${name}" clearly and correctly on the T-shirt as the central personalized logo/name treatment.
- Match the second image's design language, mood, background, lighting, sunglasses/accessories when appropriate, and premium advertising finish.
- The shirt print must look physically printed on the fabric with realistic folds and perspective.
- Produce one finished portrait-oriented ecommerce/social-media preview, clean, sharp, premium, no watermark, no extra text besides the intended shirt design/name.`;

    const result = await openai.images.edit({
      model: "gpt-image-2",
      image: images,
      prompt,
      size: "1024x1536",
      quality: "medium"
    });

    const image = result.data?.[0]?.b64_json;
    if (!image) throw new Error("Die Bild-API hat kein Bild zurückgegeben.");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ image });
  } catch (error) {
    console.error(error);
    const message = error?.status ===
    
