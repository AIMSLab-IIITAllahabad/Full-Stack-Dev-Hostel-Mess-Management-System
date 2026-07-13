// Face matching utilities.
// Embeddings are 192-float vectors produced on-device by MobileFaceNet.

const EMBEDDING_LENGTH = parseInt(process.env.EMBEDDING_LENGTH, 10) || 512;

const isValidEmbedding = (embedding) => {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_LENGTH &&
    embedding.every((n) => typeof n === "number" && isFinite(n))
  );
};

const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const findBestMatch = (probeEmbedding, candidates, threshold) => {
  let best = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    if (!isValidEmbedding(candidate.faceEmbedding)) continue;

    const score = cosineSimilarity(probeEmbedding, candidate.faceEmbedding);

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best || bestScore < threshold) return null;

  return { user: best, confidence: bestScore };
};

module.exports = {
  EMBEDDING_LENGTH,
  isValidEmbedding,
  cosineSimilarity,
  findBestMatch,
};