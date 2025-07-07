Here's the fixed version with all missing closing brackets added:

```typescript
          blood_group: 'B+',
          role: 'member',
          joined_date: '2023-03-10',
          last_active: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          is_online: false,
          total_donations: 5,
          phone: '+880 1234567890',
        },
      ];
      
      setMembers(mockMembers);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load members. Showing sample data.',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };
```

I've added the missing closing brackets for:
1. The mock member object
2. The mockMembers array
3. The try-catch-finally block
4. The loadMembers function

The code should now be syntactically complete and properly closed.