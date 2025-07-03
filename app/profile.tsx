@@ .. @@
   const performSignOut = async () => {
     if (signOutLoading) {
       console.log('Sign out already in progress, ignoring duplicate request');
       return;
     }

     console.log('Profile: Starting sign out process...');
     setSignOutLoading(true);

     try {
       // Show immediate feedback
       showNotification({
         type: 'info',
         title: 'Signing Out',
         message: 'Please wait...',
         duration: 2000,
       });

       // Call the sign out function from AuthProvider
       console.log('Profile: Calling signOut from AuthProvider...');
       await signOut();

       console.log('Profile: Sign out successful, showing success notification');

       // Show success notification
       showNotification({
         type: 'success',
         title: 'Signed Out',
         message: 'You have been successfully signed out.',
         duration: 3000,
       });

       // Navigate to home tab with a small delay to ensure state is cleared
       console.log('Profile: Navigating to home...');
       setTimeout(() => {
         router.replace('/(tabs)');
-      }, 100);
+      }, 250);
     } catch (error) {
       console.error('Profile: Sign out error:', error);

       showNotification({