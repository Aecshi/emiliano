// Simple toast hook for wireframing purposes
export const useToast = () => {
  return {
    toast: ({ title, description }: { title?: string; description?: string }) => {
      alert(`${title || ''}\n${description || ''}`);
    }
  };
}; 