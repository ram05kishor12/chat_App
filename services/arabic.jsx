import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Define translations
const resources = {
  en: {
    translation: {
      settings: 'Settings',
      switchToRTL: 'Switch to Right-to-Left (RTL)',
      switchToLTR: 'Switch to Left-to-Right (LTR)',
      restartRequired: 'Restart Required',
      restartMessage: 'The app needs to restart to apply layout changes.',
      chat :  'Chat',
      Group : 'Group',
      restartNow: 'Restart Now',
      cancel: 'Cancel',
      create : 'Create New Group',
      select : 'Select Members',
      no : 'No groups yet.',
      nouser : 'No users found',
      start : 'Start New Chat',
      login : 'Login',
      sigin : 'Sign Up',
      welcome : 'Welcome to Back',
      logincontinue : 'Login to Continue',
      email : 'Email',
      password : 'Password',
      dont : 'Don\'t have an account? ',
      newhere : 'New here ',
      createaccount : 'Create Account',
      name: 'Full Name',
      alreadyhaveaccount : 'Already have an account? ',
      sigintocontinuechattingwithyourteam : 'Sign in to continue chatting with your team',
      forgotpassword : 'Forgot Password ?',
      signuptostartchattingwithyourteam : 'Sign up to start chatting with your team',
      community : 'Community',
    },
  },
  ar: {
    translation: {
      settings: 'الإعدادات',
      switchToRTL: 'التبديل إلى اليمين-إلى-اليسار (RTL)',
      switchToLTR: 'التبديل إلى اليسار-إلى-اليمين (LTR)',
      restartRequired: 'إعادة التشغيل مطلوبة',
      restartMessage: 'يجب إعادة تشغيل التطبيق لتطبيق تغييرات التخطيط.',
      restartNow: 'إعادة التشغيل الآن',
      cancel: 'إلغاء',
      chat :  'دردشة',
      Group : 'مجموعة',
      create : 'إنشاء مجموعة جديدة',
      select : 'حدد الأعضاء',
      no : 'لا توجد مجموعات بعد.',
      nouser : 'لا يوجد مستخدمين',
      start : 'بدء دردشة جديدة',
      login : 'تسجيل الدخول',
      sigin : 'سجل',
      welcome : 'مرحبا بكم في العودة',
      logincontinue : 'تسجيل الدخول للمتابعة',
        email : 'البريد الإلكتروني',
        password : 'كلمه السر',
        dont : 'ليس لديك حساب؟ ',
        newhere : 'جديد هنا ',
        createaccount : 'إنشاء حساب للبدء',
        name: 'اسم',
        alreadyhaveaccount : 'هل لديك حساب؟ ?',
        sigintocontinuechattingwithyourteam : 'تسجيل الدخول لمتابعة الدردشة مع فريقك',
        forgotpassword : 'نسيت كلمة المرور؟',
        signuptostartchattingwithyourteam : 'سجل لبدء الدردشة مع فريقك',
        community : 'مجتمع',
    },
  },
};

const loadLanguage = async () => {
    const savedLanguage = await AsyncStorage.getItem('language');
    return savedLanguage || 'en';
  };


  loadLanguage().then((lng) => {
    i18n.use(initReactI18next).init({
      resources,
      lng: lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  });

export default i18n;
