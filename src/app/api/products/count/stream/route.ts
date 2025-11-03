/**
 * Server-Sent Events (SSE) Endpoint for Real-time Product Count Updates
 * Uses MongoDB Change Streams to push updates to clients instantly
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProductCount from '@/models/ProductCount';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper to transform data to nested object
function transformToNestedObject(
  counts: any[],
  categories: string[],
  substores: string[]
): Record<string, Record<string, number>> {
  const results: Record<string, Record<string, number>> = {};
  
  // Initialize structure
  categories.forEach(category => {
    results[category] = {};
    substores.forEach(substore => {
      results[category][substore] = 0;
    });
  });
  
  // Fill in counts
  counts.forEach((count: any) => {
    if (results[count.category]) {
      results[count.category][count.substore] = count.count;
    }
  });
  
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
  const substores = searchParams.get('substores')?.split(',').filter(Boolean) || [];

  if (categories.length === 0 || substores.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Categories and substores are required' },
      { status: 400 }
    );
  }

  await connectDB();

  // Create Server-Sent Events stream
  const encoder = new TextEncoder();
  let changeStream: any = null;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Minimal logging - only on connect
        // console.log(`[SSE] Client connected`);

        // Send initial data immediately
        const initialData = await ProductCount.find({
          category: { $in: categories },
          substore: { $in: substores },
        }).lean();

        const results = transformToNestedObject(initialData, categories, substores);
        
        const initialMessage = `data: ${JSON.stringify({ 
          type: 'initial', 
          data: results,
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        controller.enqueue(encoder.encode(initialMessage));

        // Watch for changes using MongoDB Change Streams
        try {
          changeStream = ProductCount.watch(
            [
              {
                $match: {
                  $or: [
                    { 'fullDocument.category': { $in: categories } },
                    { 'updateDescription.updatedFields.category': { $in: categories } }
                  ]
                },
              },
            ],
            { fullDocument: 'updateLookup' }
          );

          changeStream.on('change', async (change: any) => {
            try {
              // No logging for individual changes
              
              // Fetch updated data
              const updatedData = await ProductCount.find({
                category: { $in: categories },
                substore: { $in: substores },
              }).lean();

              const results = transformToNestedObject(updatedData, categories, substores);
              
              const updateMessage = `data: ${JSON.stringify({ 
                type: 'update', 
                data: results,
                timestamp: new Date().toISOString(),
                changed: {
                  category: change.fullDocument?.category,
                  substore: change.fullDocument?.substore,
                  count: change.fullDocument?.count
                }
              })}\n\n`;
              
              controller.enqueue(encoder.encode(updateMessage));
            } catch (error) {
              // Silent error handling
            }
          });

          changeStream.on('error', (error: any) => {
            console.error('[SSE] Stream error:', error);
            controller.close();
          });

          // Send heartbeat every 30 seconds to keep connection alive
          const heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch (error) {
              clearInterval(heartbeatInterval);
            }
          }, 30000);

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            // console.log('[SSE] Client disconnected');
            clearInterval(heartbeatInterval);
            if (changeStream) {
              changeStream.close();
            }
            controller.close();
          });

        } catch (streamError: any) {
          console.error('[SSE] Failed to create change stream:', streamError);
          
          // Fallback: send error message
          const errorMessage = `data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Change streams not available. Using polling fallback.',
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }

      } catch (error: any) {
        console.error('[SSE] Error in stream start:', error);
        controller.close();
      }
    },

    cancel() {
      console.log('[SSE] Stream cancelled');
      if (changeStream) {
        changeStream.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

