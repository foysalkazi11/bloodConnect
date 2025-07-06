Here's the fixed version with all missing closing brackets added:

```typescript
// ... [previous code remains the same until the end of styles] ...

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

  return (
    <SafeAreaView style={styles.container}>
      {/* ... [rest of JSX remains the same] ... */}
    </SafeAreaView>
  );
} // Added closing bracket for ClubDetailScreen component
```

The main issue was a missing closing bracket for the `ClubDetailScreen` component. I've added it at the end of the file after the final return statement.