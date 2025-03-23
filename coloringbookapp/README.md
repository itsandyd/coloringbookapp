# AI Coloring Book App

An interactive web application that allows users to generate AI coloring book pages using Replicate's paappraiser/retro-coloring-book model and color them directly in the browser.

## Features

- Generate coloring book pages from text prompts using AI
- Interactive coloring interface with different brush sizes and colors
- Save your colored images
- Download your creations as PNG files
- Serverless PostgreSQL database using Neon to store images and drawings

## Technologies Used

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Konva (for the canvas drawing)
- Replicate API (for AI image generation)
- Neon Database (for serverless PostgreSQL)
- Drizzle ORM (for database interactions)

## Prerequisites

Before you can run this application, you need:

1. Node.js 18+ installed
2. A [Replicate](https://replicate.com) account and API token
3. A [Neon](https://neon.tech) account and database connection string

## Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/yourusername/coloringbookapp.git
cd coloringbookapp
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your API tokens:

```
# Replicate API token for image generation
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Neon Database connection string
DATABASE_URL=postgresql://user:password@hostname/database
```

4. Set up the database tables by visiting the migration endpoint once:

```
http://localhost:3000/api/db/migrate
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to use the app.

## Setting up Neon Database

1. Create an account at [Neon](https://neon.tech)
2. Create a new project and get your connection string
3. Add the connection string to your `.env.local` file
4. The app will automatically create the necessary tables when you visit the migration endpoint

## How to Use

1. **Generate a coloring page**:

   - Enter a descriptive prompt in the input field (e.g., "a cute cat playing with yarn")
   - Click "Generate Coloring Page"
   - Wait for the AI to create your image

2. **Color your image**:
   - Choose colors from the color palette
   - Select a brush size
   - Click and drag on the image to color
   - Your drawing progress is automatically saved to the database
   - Use the Clear button to start over
   - Download your creation when finished

## Deployment

This application can be deployed to platforms like Vercel or Netlify. Make sure to set the environment variables in your hosting provider's settings.

## License

This project is licensed under the MIT License.

## Acknowledgements

- [Replicate](https://replicate.com) for providing the AI model API
- [Neon](https://neon.tech) for the serverless PostgreSQL database
- [Retro Coloring Book model by paappraiser](https://replicate.com/paappraiser/retro-coloring-book)
