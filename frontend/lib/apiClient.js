import supabase from './supabase';

/**
 * Fetches data from the API with an Authorization header if a session exists.
 *
 * @param {string} url The URL to fetch.
 * @param {object} options The options for the fetch request (method, body, etc.).
 * @returns {Promise<any>} A promise that resolves with the JSON response.
 * @throws {Error} If the network response is not ok or if no session is found for protected routes (optional handling).
 */
export async function fetchWithAuth(url, options = {}) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting Supabase session:', sessionError);
      // Depending on the desired behavior, you might throw an error here
      // or allow the request to proceed without an auth header if it's a public route.
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers, // Allow overriding content-type or adding other headers
    };

    if (session && session.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      // Handle cases where no session is available.
      // For now, we'll log it. For strictly protected routes, you might want to throw an error.
      console.warn(`No Supabase session found or access token missing for request to ${url}. Proceeding without Authorization header.`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If the error response is not JSON, use text
        errorData = await response.text();
      }
      console.error('API Error Response:', errorData);
      const error = new Error(errorData.message || response.statusText || 'API request failed');
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    // If response has no content, return null or an appropriate value
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json();
    } else {
      return response.text(); // Or handle other content types as needed
    }

  } catch (error) {
    console.error(`Error in fetchWithAuth for URL ${url}:`, error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

// Company Profiles API functions
export async function createCompanyProfile(companyName, websiteUrl) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  return fetchWithAuth(`${backendUrl}/api/company-profiles/create`, {
    method: 'POST',
    body: JSON.stringify({ company_name: companyName, website_url: websiteUrl })
  });
}

export async function associateProfileToCampaign(campaignId, profileId) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  return fetchWithAuth(`${backendUrl}/api/company-profiles/associate-campaign/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ profile_id: profileId })
  });
}

export async function getCompanyProfiles() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  return fetchWithAuth(`${backendUrl}/api/company-profiles/`);
}

export async function deleteCompanyProfile(profileId) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  return fetchWithAuth(`${backendUrl}/api/company-profiles/${profileId}`, {
    method: 'DELETE'
  });
}

export async function getCompanyProfile(profileId) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  return fetchWithAuth(`${backendUrl}/api/company-profiles/${profileId}`, {
    method: 'GET'
  });
}

// Example usage (optional - for demonstration)
/*
async function getMyData() {
  try {
    const data = await fetchWithAuth('/api/my-protected-route', { method: 'GET' });
    console.log(data);
  } catch (error) {
    console.error('Failed to fetch my data:', error);
    if (error.status === 401) {
      // Redirect to login or show an error message
    }
  }
}
*/

// Add these new functions after the existing ones

 