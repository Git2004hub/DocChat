import { CloudClient } from "chromadb";

async function testStoredEmbedding() {
  const client = new CloudClient({
    apiKey: process.env.CHROMA_API_KEY!,
    tenant: process.env.CHROMA_TENANT!,
    database: process.env.CHROMA_DATABASE!,
  });

  const collection =
    await client.getCollection({
      name: "document_chunks",
      embeddingFunction: undefined,
    });

  const result = await collection.get({
    limit: 1,
    include: [
      "documents",
      "metadatas",
      "embeddings",
    ],
  });

  const embedding = result.embeddings?.[0];

  console.log("ID :", result.ids[0]);

  console.log(
    "Document :",
    result.documents?.[0]?.slice(0, 120),
  );

  console.log(
    "Dimension de l'embedding :",
    embedding?.length,
  );

  console.log(
    "10 premières valeurs :",
    embedding?.slice(0, 10),
  );
}

testStoredEmbedding().catch((error) => {
  console.error(
    "Erreur lors de la lecture de l'embedding :",
    error,
  );
});