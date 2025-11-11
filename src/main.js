import './style.css'
import { Chatbot } from './chatbot.js'

// DOM이 로드된 후 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
  new Chatbot()
})
