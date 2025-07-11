# BloodConnect - Project Overview

## 🩸 About BloodConnect

A React Native Expo app connecting blood donors with donation clubs to facilitate life-saving blood donations. Serves two primary user types: individual donors and blood donation clubs.

## 🛠 Tech Stack

- **Framework**: React Native with Expo
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Icons**: Lucide React Native
- **Localization**: react-i18next

## 🎨 Design Philosophy

- **Professional & Medical**: Clean, trustworthy healthcare design
- **Accessible**: High contrast, readable, screen reader friendly
- **Consistent**: Unified design system across all screens
- **User-Centric**: Intuitive for both donors and clubs

## 🎯 Best Practices & Rules

### **Styling Guidelines**

- ✅ **Always use NativeWind classes** over StyleSheet for simple styles
- ✅ **Reference theme.ts** for colors and typography
- ✅ **Use consistent spacing**: `p-4`, `px-5`, `py-3`, `gap-3`
- ✅ **Red color (#DC2626)** for primary actions and blood theme
- ✅ **Inter font family** with proper font weights

### **Component Patterns**

```typescript
// Standard card pattern
<View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">

// Primary button
<TouchableOpacity className="bg-red-600 px-6 py-3 rounded-xl active:bg-red-700">

// Status badge
<View className="bg-red-600 px-3 py-1 rounded-lg">
  <Text className="text-white font-bold text-sm">A+</Text>
</View>
```

### **Code Quality**

- ✅ **TypeScript strict mode** - No `any` types
- ✅ **Proper prop interfaces** for all components
- ✅ **PascalCase** for components, **camelCase** for props
- ✅ **Boolean props** prefixed with `is`, `has`, `can`, `should`
- ✅ **React.memo()** for expensive list items
- ✅ **FlatList** for large datasets

### **Accessibility**

- ✅ **accessibilityLabel** for all interactive elements
- ✅ **4.5:1 color contrast ratio** minimum
- ✅ **Screen reader support** with proper semantic elements
- ✅ **Platform-specific patterns** (iOS/Android)

### **Medical Context**

- ✅ **Professional medical terminology**
- ✅ **Clear status indicators** for critical information
- ✅ **Trustworthy tone** in all copy
- ✅ **Red color used meaningfully** (not just decoration)
- ✅ **Clear information hierarchy** for urgent notifications

### **Architecture**

- ✅ **Supabase RLS policies** for data security
- ✅ **Proper error boundaries** and error handling
- ✅ **Loading states** for all async operations
- ✅ **Empty states** with helpful messaging
- ✅ **Optimistic updates** for better UX

### **File Organization**

```
components/
  ui/           # Reusable UI components
  club/         # Club-related components
  donor/        # Donor-specific components
  forms/        # Form components
theme/
  colors.ts     # Color definitions
  typography.ts # Typography scales
```

### **Localization**

- ✅ **Use useI18n hook** for all user-facing text
- ✅ **Namespace translations** by feature/screen (e.g., `auth.signIn`, `home.title`)
- ✅ **Medical terminology** must be culturally appropriate
- ✅ **Blood group translations** for local context
- ✅ **RTL support** consideration for future languages
- ✅ **No hardcoded strings** in components
- ✅ **Fallback language** always available (English)

```typescript
// ✅ Good - using translation keys
const { t } = useI18n();
<Text>{t('auth.signIn')}</Text>

// ❌ Bad - hardcoded text
<Text>Sign In</Text>

// ✅ Good - with interpolation
<Text>{t('profile.welcomeMessage', { name: user.name })}</Text>

// ✅ Good - blood group localization
<Text>{t('bloodGroups.A+')}</Text>
```

### **Performance**

- ✅ **Image optimization** with appropriate sizes
- ✅ **Lazy loading** for heavy components
- ✅ **Efficient re-renders** with proper dependencies
- ✅ **Background data fetching** for smooth UX

## 🔒 Security Considerations

- **Row Level Security (RLS)** enabled on all Supabase tables
- **Proper authentication** flow for donors and clubs
- **Data validation** on both client and server
- **Secure API endpoints** with proper permissions

## 📱 User Types

1. **Donors**: Individuals who donate blood
2. **Clubs**: Organizations that organize blood drives

## 🚀 Key Features

- Blood donation tracking
- Club membership management
- Real-time chat and messaging
- Event organization and RSVP
- Gallery for sharing donation experiences
- Join request workflow
- Push notifications

---

**Remember**: This is a life-saving application. Prioritize clarity, reliability, and user trust in every design decision.
