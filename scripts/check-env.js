#!/usr/bin/env node

/**
 * Скрипт проверки переменных окружения перед деплоем
 * Использование: node scripts/check-env.js [--production]
 */

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Определяем режим (development или production)
const isProduction = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const envFile = isProduction ? '.env.production' : '.env.local';
const envPath = path.join(process.cwd(), envFile);

log(`\n🔍 Проверка переменных окружения (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`, 'cyan');
log(`📁 Файл: ${envFile}\n`, 'blue');

// Обязательные переменные
const requiredVars = {
  development: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  production: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL',
    'NODE_ENV',
  ],
};

// Рекомендуемые переменные
const recommendedVars = {
  development: [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL',
  ],
  production: [
    'OPENROUTER_API_KEY',
  ],
};

// Проверяем существование файла
if (!fs.existsSync(envPath)) {
  log(`❌ Файл ${envFile} не найден!`, 'red');
  log(`💡 Создайте файл на основе .env.example:`, 'yellow');
  log(`   cp .env.example ${envFile}`, 'yellow');
  process.exit(1);
}

// Загружаем переменные из файла
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  // Пропускаем комментарии и пустые строки
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  }
});

// Также загружаем из process.env (для проверки на сервере)
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('SUPABASE_') || key.startsWith('OPENROUTER_')) {
    envVars[key] = process.env[key];
  }
});

let hasErrors = false;
let hasWarnings = false;

// Проверяем обязательные переменные
const required = isProduction ? requiredVars.production : requiredVars.development;
log('📋 Проверка обязательных переменных:', 'cyan');
required.forEach((varName) => {
  const value = envVars[varName];
  if (!value || value === '' || value.includes('your_') || value.includes('your-')) {
    log(`  ❌ ${varName} - не установлена или содержит placeholder`, 'red');
    hasErrors = true;
  } else {
    // Проверяем формат для некоторых переменных
    if (varName.includes('URL') && !value.startsWith('http://') && !value.startsWith('https://')) {
      log(`  ⚠️  ${varName} - неверный формат URL: ${value}`, 'yellow');
      hasWarnings = true;
    } else if (varName.includes('KEY') && value.length < 20) {
      log(`  ⚠️  ${varName} - ключ слишком короткий (${value.length} символов)`, 'yellow');
      hasWarnings = true;
    } else {
      // Скрываем часть значения для безопасности
      const displayValue = varName.includes('KEY') 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
        : value;
      log(`  ✅ ${varName} = ${displayValue}`, 'green');
    }
  }
});

// Проверяем рекомендуемые переменные
const recommended = isProduction ? recommendedVars.production : recommendedVars.development;
if (recommended.length > 0) {
  log('\n💡 Проверка рекомендуемых переменных:', 'cyan');
  recommended.forEach((varName) => {
    const value = envVars[varName];
    if (!value || value === '' || value.includes('your_') || value.includes('your-')) {
      log(`  ⚠️  ${varName} - не установлена (опционально)`, 'yellow');
      hasWarnings = true;
    } else {
      const displayValue = varName.includes('KEY') 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
        : value;
      log(`  ✅ ${varName} = ${displayValue}`, 'green');
    }
  });
}

// Специальные проверки для production
if (isProduction) {
  log('\n🔒 Проверка настроек для production:', 'cyan');
  
  // Проверяем, что NODE_ENV = production
  if (envVars.NODE_ENV !== 'production') {
    log(`  ⚠️  NODE_ENV должен быть 'production', текущее значение: ${envVars.NODE_ENV}`, 'yellow');
    hasWarnings = true;
  } else {
    log(`  ✅ NODE_ENV = production`, 'green');
  }
  
  // Проверяем, что NEXT_PUBLIC_APP_URL использует HTTPS
  if (envVars.NEXT_PUBLIC_APP_URL && !envVars.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
    log(`  ⚠️  NEXT_PUBLIC_APP_URL должен использовать HTTPS в production`, 'yellow');
    log(`     Текущее значение: ${envVars.NEXT_PUBLIC_APP_URL}`, 'yellow');
    hasWarnings = true;
  } else if (envVars.NEXT_PUBLIC_APP_URL) {
    log(`  ✅ NEXT_PUBLIC_APP_URL использует HTTPS`, 'green');
  }
  
  // Проверяем, что redirect URL совпадает с базовым URL
  if (envVars.NEXT_PUBLIC_APP_URL && envVars.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL) {
    const baseUrl = new URL(envVars.NEXT_PUBLIC_APP_URL).origin;
    const redirectUrl = new URL(envVars.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL).origin;
    if (baseUrl !== redirectUrl) {
      log(`  ⚠️  NEXT_PUBLIC_APP_URL и NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL должны использовать один домен`, 'yellow');
      log(`     Базовый URL: ${baseUrl}`, 'yellow');
      log(`     Redirect URL: ${redirectUrl}`, 'yellow');
      hasWarnings = true;
    } else {
      log(`  ✅ URL используют один домен`, 'green');
    }
  }
}

// Итоговый результат
log('\n' + '='.repeat(50), 'cyan');
if (hasErrors) {
  log('❌ Обнаружены ошибки! Исправьте их перед деплоем.', 'red');
  process.exit(1);
} else if (hasWarnings) {
  log('⚠️  Проверка завершена с предупреждениями.', 'yellow');
  log('💡 Рекомендуется исправить предупреждения перед деплоем.', 'yellow');
  process.exit(0);
} else {
  log('✅ Все проверки пройдены успешно!', 'green');
  if (isProduction) {
    log('\n📝 Следующие шаги:', 'cyan');
    log('1. Убедитесь, что URL добавлены в Supabase Dashboard:', 'blue');
    log('   - Authentication -> URL Configuration -> Redirect URLs', 'blue');
    log('2. Проверьте настройки CORS в Supabase Dashboard', 'blue');
    log('3. Запустите сборку: npm run build', 'blue');
    log('4. Запустите приложение: npm start или pm2 start', 'blue');
  }
  process.exit(0);
}

