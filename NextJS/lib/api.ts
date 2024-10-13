export interface SessionResponse {
  session: string;
  hub: string;
}

export const createSession = async (
  url: string,
  file: File
): Promise<SessionResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  // Remove below eslint when error handling is in!
  // eslint-disable-next-line no-useless-catch
  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to create session. Status: ${response.status}`);
    }

    // Cast the result to `SessionResponse`
    const data = (await response.json()) as SessionResponse;
    return data;
  } catch (error) {
    // Do other stuff here later
    throw error; // Rethrow the error for handling in the calling code
  }
};

export interface ApiResponseItem {
  id: string;
  prompt: string;
  text: string;
  title: string;
  thread_id: string;
  parent_node_id: string | null;
  images: { id: string; url: string }[];
  questions: { id: string; content: string }[];
}

// Polling function with partial results handling through a callback
export const pollApiUntilNItems = async (
  url: string,
  n: number,
  onPartialResult: (data: ApiResponseItem[]) => void, // callback for partial results
  interval = 5000 // Default interval of 5 seconds
): Promise<void> => {
  let currentData: ApiResponseItem[] = []; // Keep track of the data we have

  const poll = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch. Status: ${response.status}`);
      }

      const newData = (await response.json()) as ApiResponseItem[];

      // Compare new data with current data to find new items
      const additionalItems = newData.slice(currentData.length);

      if (additionalItems.length > 0) {
        currentData = [...currentData, ...additionalItems]; // Update current data

        // Invoke the callback with the latest partial results
        onPartialResult(currentData);
      }

      // If we have fewer than n items, keep polling
      if (currentData.length < n) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(poll, interval);
      }

    } catch (error) { /* empty */ }
  };

  await poll(); // Start polling immediately
};

