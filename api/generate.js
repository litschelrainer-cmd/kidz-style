
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseDataUrl(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl || "");

  if (!match) {
    throw new Error("Ungültiges Bildformat.");
  }

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST ist erlaubt.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY fehlt in Vercel.",
    });
  }

  try {
    const {
      childImage,
      styleReference,
      name,
      style,
      model,
      color,
    } = req.body || {};

    if (!childImage || !styleReference || !name || !style || !color) {
      return res.status(400).json({
        error: "Foto, Design, Name oder Farbe fehlt.",
      });
    }

    const person = parseDataUrl(childImage);
    const reference = parseDataUrl(styleReference);

    const images = [
      await toFile(person.buffer, "person.jpg", {
        type: person.mime,
      }),
      await toFile(reference.buffer, "design-reference.jpg", {
        type: reference.mime,
      }),
    ];

    const initial = name.trim().charAt(0).toUpperCase();

    const prompt = `
Create a premium photorealistic KIDZ STYLE product preview.

IMAGE 1:
This is the customer/person.
Preserve this person's identity as faithfully as possible.

IDENTITY IS CRITICAL:
- Keep the same person from image 1.
- Preserve facial features and facial proportions.
- Preserve apparent age.
- Preserve hairstyle and hair color.
- Preserve skin tone.
- Preserve gender presentation.
- Preserve recognizable identity.
- DO NOT make an adult younger.
- DO NOT turn an adult into a child.
- DO NOT replace the person with the person/model from image 2.

IMAGE 2:
This is ONLY the selected KIDZ STYLE design and visual reference.

T-SHIRT DESIGN:
- Reproduce the T-shirt graphic from image 2 as closely as possible.
- Keep the same composition, graphic elements, proportions, colors and placement.
- Do NOT invent a new logo.
- Do NOT redesign the selected graphic.
- Replace ONLY the original main initial/letter with "${initial}".
- The ONLY personalized text allowed in this design is the single letter "${initial}".
- DO NOT write "${name}" anywhere.
- DO NOT add a second name.
- DO NOT add extra words or letters.
- T-shirt color: ${color}.

VISUAL STYLE:
- Category: ${style}
- Selected reference model: ${model}
- Image 2 may guide pose, background, lighting and overall advertising mood.
- It must NEVER determine the identity of the person.
- Keep the result natural and photorealistic.
- Make the T-shirt and print look physically real.
- The print must follow the folds and perspective of the fabric.
- Premium ecommerce advertising quality.
- Portrait orientation.
- No watermark.
- No additional text outside the intended shirt graphic.

FINAL CHECK:
1. Same recognizable person as image 1.
2. Same apparent age as image 1.
3. Design remains as close as possible to image 2.
4. Only the initial "${initial}" appears in the personalized design.
5. The written name "${name}" must NOT appear.
`;

    const result = await openai.images.edit({
      model: "gpt-image-2",
      image: images,
      prompt,
      size: "1024x1536",
      quality: "medium",
    });

    const generatedImage = result.data?.[0]?.b64_json;

    if (!generatedImage) {
      throw new Error("Die Bild-API hat kein Bild zurückgegeben.");
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      image: generatedImage,
    });
  } catch (error) {
    console.error("KIDZ STYLE generation error:", error);

    const status =
      Number.isInteger(error?.status) &&
      error.status >= 400 &&
      error.status < 600
        ? error.status
        : 500;

    const message =
      error?.status === 401
        ? "Der OpenAI-API-Schlüssel ist ungültig."
        : error?.status === 429
        ? "Das OpenAI-API-Guthaben oder Nutzungslimit ist erreicht."
        : error?.message || "Fehler bei der KI-Bilderstellung.";

    return res.status(status).json({
      error: message,
    });
  }
}
