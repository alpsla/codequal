import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

/**
 * PR Review form component
 */
export function PRReviewForm() {
  const [prUrl, setPrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabaseClient();
  
  /**
   * Submit form
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate PR URL
    if (!prUrl) {
      setError('PR URL is required');
      return;
    }
    
    // GitHub or GitLab PR URL validation
    const validUrl = /https:\/\/(github|gitlab)\.com\/[^\/]+\/[^\/]+(\/pull\/\d+|\/\-\/merge_requests\/\d+)/;
    if (!validUrl.test(prUrl)) {
      setError('Invalid PR URL. Must be a GitHub or GitLab PR URL.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated');
        setIsSubmitting(false);
        return;
      }
      
      // Submit PR review request
      const response = await fetch('/api/pr-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prUrl,
          userId: user.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error submitting PR review');
      }
      
      const result = await response.json();
      
      // Redirect to results page
      router.push(`/results/${result.prReviewId}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-md shadow-md">
      <h2 className="text-xl font-bold mb-4">Analyze Pull Request</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PR URL
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="https://github.com/owner/repo/pull/123"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            disabled={isSubmitting}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Analyzing...' : 'Analyze PR'}
        </button>
      </form>
    </div>
  );
}