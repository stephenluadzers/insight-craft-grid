/**
 * LEGAL DISCLAIMER:
 * This software analyzes publicly available data from YouTube and other supported platforms 
 * strictly for educational, analytical, and productivity purposes. It does not download, 
 * store, or redistribute any video, audio, or copyrighted content.
 * 
 * The system extracts and transforms publicly accessible metadata (titles, descriptions, 
 * tags, captions, and timing structures) to generate workflow diagrams and summaries.
 * 
 * This process is a transformative use under Section 107 of the U.S. Copyright Act and 
 * complies with the YouTube Terms of Service (Sections 5.B and 6.C), as no unauthorized 
 * reproduction, monetization, or rehosting of the source material occurs.
 * 
 * All intellectual property rights in the original videos remain with their respective creators. 
 * Users are responsible for ensuring that their own use of the generated workflows complies 
 * with applicable local laws and platform policies.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch video transcript using YouTube's timedtext API
async function fetchTranscript(videoId: string): Promise<string> {
  try {
    // First, get the video page to extract caption tracks
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const videoPageText = await videoPageResponse.text();
    
    // Look for caption track URL in the page
    const captionMatch = videoPageText.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) {
      console.log('No captions found for video');
      return '';
    }
    
    const captionTracks = JSON.parse(captionMatch[1]);
    if (captionTracks.length === 0) return '';
    
    // Get the first English caption track or any available track
    const englishTrack = captionTracks.find((t: any) => t.languageCode === 'en') || captionTracks[0];
    const captionUrl = englishTrack.baseUrl;
    
    // Fetch the actual captions
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();
    
    // Parse XML and extract text
    const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
    const transcript = Array.from(textMatches)
      .map(match => match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      )
      .join(' ');
    
    return transcript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return '';
  }
}

// Fetch video metadata using oEmbed API (no API key required)
async function fetchMetadata(videoId: string) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    return await response.json();
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error('YouTube URL is required');
    }

    console.log('Processing YouTube URL:', url);
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log('Extracted video ID:', videoId);

    // Fetch video data in parallel
    const [transcript, metadata] = await Promise.all([
      fetchTranscript(videoId),
      fetchMetadata(videoId)
    ]);

    console.log('Metadata:', metadata);
    console.log('Transcript length:', transcript.length);

    if (!transcript && !metadata) {
      throw new Error('Could not extract any data from the video');
    }

    // Construct a comprehensive description for workflow generation
    const videoDescription = `
YouTube Video Analysis:
Title: ${metadata?.title || 'Unknown'}
Author: ${metadata?.author_name || 'Unknown'}

${transcript ? `Video Content/Transcript:\n${transcript.slice(0, 4000)}${transcript.length > 4000 ? '...' : ''}` : 'No transcript available'}

${metadata?.description || ''}
    `.trim();

    return new Response(
      JSON.stringify({
        videoId,
        title: metadata?.title,
        author: metadata?.author_name,
        thumbnail: metadata?.thumbnail_url,
        transcript: transcript || null,
        description: videoDescription,
        transcriptLength: transcript.length,
        hasTranscript: !!transcript
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-youtube-video:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
