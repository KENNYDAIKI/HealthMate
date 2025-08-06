from src.helper import load_pdf_file, text_split, download_hugging_face_embeddings
from pinecone.grpc import PineconeGRPC as Pinecone
from pinecone import ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv
import os

load_dotenv()

PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
os.environ['PINECONE_API_KEY'] = PINECONE_API_KEY

# print(PINECONE_API_KEY)
# print(PINECONE_API_ENV)

extracted_data = load_pdf_file(pdf="pdf/")
text_chunks = text_split(extracted_data)
embeddings = download_hugging_face_embeddings()


#Initializing the Pinecone
pc= Pinecone(api_key=PINECONE_API_KEY)

index_name="healthmate"


pc.create_index(
    name=index_name,
    dimension=384,  #  must match the embedding size
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)
  


  # Embed each chunk and upsert the embeddings to my Pinecone index
docsearch = PineconeVectorStore.from_documents(
    documents=text_chunks,
    index_name=index_name,
    embedding=embeddings,
  )