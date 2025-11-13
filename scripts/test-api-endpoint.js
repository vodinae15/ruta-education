const fetch = require('node-fetch')

async function testAPIEndpoint() {
  try {
    console.log('🧪 Тестирование API endpoint /api/course-access')
    
    const courseId = 'd09b07d9-7487-4a25-a7a6-651b62f96c72'
    const url = `http://localhost:3000/api/course-access?courseId=${courseId}`
    
    console.log('📤 Запрос к:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('📥 Статус ответа:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Ошибка HTTP:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('📄 Данные ответа:', JSON.stringify(data, null, 2))
    
    if (data.students) {
      console.log('👥 Найдено студентов:', data.students.length)
      data.students.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.students.email} (ID: ${student.students.id})`)
      })
    } else {
      console.log('⚠️ Поле students отсутствует в ответе')
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testAPIEndpoint()
