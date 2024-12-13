export const formatTimestamp = (timestamp: string | number): string => {
    try {
      const date = new Date(Number(timestamp));
      return new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date).replace(/\./g, '/');
    } catch (error) {
      return 'Invalid date';
    }
  };