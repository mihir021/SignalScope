/**
 * SignalScope Backend API Client
 *
 * Interacts with the FastAPI backend:
 * - GET  /                        Health check
 * - POST /predict/detailed        Detailed forensic classification with attention heatmap overlay
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Check backend health status
 * @returns {Promise<{ status: string, service: string, version: string }>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('SignalScope API health check failed:', err.message);
    throw err;
  }
}

/**
 * Upload and analyze an image using the detailed forensic pipeline
 * @param {File} file - Image file (PNG, JPG, JPEG, WEBP)
 * @param {string} [caption] - Optional text prompt/caption for multimodal cross-matching
 * @returns {Promise<Object>} Detailed prediction response payload
 */
export async function analyzeImage(file, caption = null) {
  const formData = new FormData();
  formData.append('file', file);

  if (caption && caption.trim().length > 0) {
    formData.append('caption', caption.trim());
  }

  const endpoint = `${API_BASE_URL}/predict/detailed?include_overlay=true`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        // Do NOT manually set Content-Type header with FormData;
        // fetch automatically sets multipart/form-data with proper boundary.
      },
      body: formData,
    });

    if (!res.ok) {
      let errorMessage = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to HTTP status text if body is not JSON
        errorMessage = res.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (err) {
    console.error('SignalScope analysis request failed:', err);
    throw err;
  }
}

/**
 * Request a semantic summary of what the entire image depicts
 * @param {File} file - Image file
 * @returns {Promise<Object>} Whole image summary payload
 */
export async function getImageSummary(file) {
  const formData = new FormData();
  formData.append('file', file);

  const endpoint = `${API_BASE_URL}/image/summary`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Image summary request failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error('Whole-image summary request failed:', err);
    throw err;
  }
}

export { API_BASE_URL };

