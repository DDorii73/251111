// 환경변수에서 API 키 가져오기
const OPENAI_API_KEY = import.meta.env.VITE_GPT_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
const API_KEY_VAR = OPENAI_API_KEY
  ? (import.meta.env.VITE_GPT_API_KEY ? 'VITE_GPT_API_KEY' : 'VITE_OPENAI_API_KEY')
  : null
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const USE_LOCAL_RECO = !OPENAI_API_KEY

// 시스템 프롬프트 생성
function getSystemPrompt() {
  return [
    '당신은 히말라야 트래킹 전문 여행 플래너입니다.',
    '사용자가 기간(일수)과 난이도(쉬움/보통/어려움)를 말하면,',
    '네팔/티베트/인도 히말라야의 대표 코스를 2~3개 추천하세요.',
    '각 코스에 대해:',
    '- 예상 소요기간(이동/적응일 포함 범위)',
    '- 난이도(쉬움/보통/어려움)와 고도 적응 이슈',
    '- 핵심 하이라이트(뷰포인트/마을/호수 등)',
    '- 최적 시즌, 퍼밋/가이드 필요 여부',
    '간결한 bullet로 한국어로 답하고, 적절한 이모티콘(🏔️, ⏱️, ⛰️, ✨, 📅, 🎫 등)을 사용하여 가독성을 높이세요.',
    '필요 시 대안/단축 코스도 제안하세요.',
    '예시 코스: 푼힐, 랑탕, 마르디 히말, 안나푸르나 서킷, 에베레스트 베이스캠프, 고쿄 호수, 마나슬루, 어퍼 무스탕, 칸첸중가 등.'
  ].join(' ')
}

// 쿼리에서 기간과 난이도 파싱
function parseQuery(query) {
  const q = query.toLowerCase()
  const daysMatch = q.match(/(\d+)\s*[-~–]?\s*(\d+)?\s*일|(\d+)\s*days?|\b(\d+)-(\d+)\b/)
  let minDays, maxDays
  if (daysMatch) {
    const nums = [daysMatch[1], daysMatch[2], daysMatch[3], daysMatch[4], daysMatch[5]]
      .filter(Boolean).map(Number)
    if (nums.length >= 2) { minDays = Math.min(nums[0], nums[1]); maxDays = Math.max(nums[0], nums[1]) }
    else if (nums.length === 1) { minDays = nums[0]; maxDays = nums[0] }
  }
  let difficulty = '보통'
  if (q.includes('쉬움') || q.includes('easy')) difficulty = '쉬움'
  if (q.includes('어려움') || q.includes('hard')) difficulty = '어려움'
  if (q.includes('보통') || q.includes('moderate')) difficulty = '보통'
  return { minDays, maxDays, difficulty }
}

// 로컬 추천 로직 (API 키가 없을 때 사용)
function localRecommend(query) {
  const { minDays, maxDays, difficulty } = parseQuery(query)
  const dmin = minDays ?? 5
  const dmax = maxDays ?? (minDays ? minDays : 7)
  const byDays = (d) => {
    if (d <= 5) return 'short'
    if (d <= 10) return 'mid'
    return 'long'
  }
  const bucket = byDays(Math.round((dmin + dmax) / 2))
  const difficultyEmoji = difficulty === '쉬움' ? '🟢' : difficulty === '어려움' ? '🔴' : '🟡'
  const lines = []
  lines.push(`📋 요청 요약: 기간 ${dmin}${dmin !== dmax ? `~${dmax}` : ''}일, 난이도 ${difficultyEmoji} ${difficulty}`)
  lines.push('')
  if (bucket === 'short') {
    lines.push('🏔️ 푼힐(Poon Hill) 트레킹')
    lines.push('   ⏱️ 3~5일 · 난이도 🟢 쉬움~🟡 보통 · ⛰️ 최대 약 3,200m')
    lines.push('   ✨ 하이라이트: 안나푸르나/다울라기리 일출 파노라마, 깐드룩 마을')
    lines.push('   📅 시즌/퍼밋: 3~5월, 10~11월 우수 · 🎫 ACAP/TIMS 필요')
    lines.push('')
    lines.push('🏔️ 마르디 히말(Mardi Himal) 단축 코스')
    lines.push('   ⏱️ 4~6일 · 난이도 🟡 보통 · 🌄 릿지 뷰포인트')
    lines.push('   ✨ 하이라이트: 포카라 근접, 날씨 좋을 때 능선 조망 탁월')
    lines.push('')
    lines.push('🏔️ 랑탕 밸리(Langtang) 단축')
    lines.push('   ⏱️ 5~7일 · 난이도 🟡 보통 · 🏛️ 카얀진 곰파/전망대')
  } else if (bucket === 'mid') {
    lines.push('🏔️ 랑탕 밸리(Langtang) + 카얀진 뷰포인트')
    lines.push('   ⏱️ 6~9일 · 난이도 🟡 보통 · ⛰️ 최대 4,000m대 적응 유의')
    lines.push('   ✨ 하이라이트: 카얀진 리(Kyanjin Ri), 야생 풍광, 접근성 우수')
    lines.push('')
    lines.push('🏔️ 안나푸르나 베이스캠프(ABC)')
    lines.push('   ⏱️ 7~10일 · 난이도 🟡 보통 · ⛰️ 고도 4,130m, 🌅 일출/설산 대장관')
    lines.push('   📅 시즌/퍼밋: 성수기 혼잡, 🎫 ACAP/TIMS 필요')
    lines.push('')
    lines.push('🏔️ 에베레스트 지역 고쿄 호수(Gokyo) 입문')
    lines.push('   ⏱️ 8~10일 · 난이도 🟡 보통~🔴 어려움 · 🏔️ 고쿄리 전망')
  } else {
    lines.push('🏔️ 에베레스트 베이스캠프(EBC) 또는 고쿄+초라패스')
    lines.push('   ⏱️ 12~14+일 · 난이도 🔴 어려움 · ⛰️ 고도 적응 필수, 최대 5,000m+')
    lines.push('   ✨ 하이라이트: 에베레스트 마시프, 카라파타르, 🧊 빙하/호수')
    lines.push('')
    lines.push('🏔️ 안나푸르나 서킷(Thorong La)')
    lines.push('   ⏱️ 12~16일 · 난이도 🟡 보통~🔴 어려움 · ⛰️ 5,416m 패스, 풍경 다양')
    lines.push('')
    lines.push('🏔️ 마나슬루(Manaslu) 또는 어퍼 무스탕(Upper Mustang)')
    lines.push('   ⏱️ 12~16일 · 난이도 🔴 어려움 · 🎫 제한구역 퍼밋/가이드 필수')
  }
  lines.push('')
  lines.push('💡 추가 팁:')
  lines.push('   📅 최적 시즌: 보통 3~5월, 10~11월')
  lines.push('   🎫 퍼밋: 지역별 ACAP/TIMS 혹은 제한구역 퍼밋 필요')
  lines.push('   ⛰️ 고도 적응: 3,000m 이상은 천천히 상승, 💧 수분/휴식 유지')
  return lines.join('\n')
}

// OpenAI API를 통한 추천 요청
async function requestRecommendation(query) {
  if (USE_LOCAL_RECO) {
    return localRecommend(query)
  }
  const messages = [
    { role: 'system', content: getSystemPrompt() },
    { role: 'user', content: query }
  ]
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7
    })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`API 오류(${res.status}): ${txt || res.statusText}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('API 응답이 비어 있습니다.')
  return content
}

// 챗봇 클래스
export class Chatbot {
  constructor(options = {}) {
    this.chatMessages = options.chatMessages || document.getElementById('chat-messages')
    this.userInput = options.userInput || document.getElementById('user-input')
    this.sendBtn = options.sendBtn || document.getElementById('send-btn')
    this.chatForm = options.chatForm || document.getElementById('chat-form')
    this.chips = options.chips || document.querySelectorAll('.chip')
    this.modeBadge = options.modeBadge || document.getElementById('mode-badge')
    
    this.init()
  }

  init() {
    // 이벤트 리스너 설정
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleSubmit()
    })

    this.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text') || ''
        this.handleSubmit(text)
      })
    })

    // 모드 배지 설정
    this.modeBadge.textContent = USE_LOCAL_RECO
      ? '🔧 데모 모드(로컬 추천 사용): API 키 미설정'
      : `🤖 실시간 GPT 모드: ${API_KEY_VAR} 사용 중`

    // 초기 환영 메시지
    this.appendMessage('assistant', '👋 안녕하세요! 🏔️ 히말라야 트래킹 코스 추천 봇입니다.\n\n기간과 난이도를 알려주시면 맞춤형 트래킹 코스를 추천해 드릴게요.\n\n예시: "6-8일 보통 난이도" 또는 아래 빠른 선택 버튼을 사용해보세요! ⬇️')
  }

  // 메시지 추가
  appendMessage(role, text, isHTML = false) {
    const wrapper = document.createElement('div')
    wrapper.className = `msg ${role}`
    const bubble = document.createElement('div')
    bubble.className = 'bubble'
    if (isHTML) {
      bubble.innerHTML = text
    } else {
      bubble.textContent = text
    }
    wrapper.appendChild(bubble)
    this.chatMessages.appendChild(wrapper)
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight
  }

  // 로딩 메시지 표시
  showLoading() {
    const wrapper = document.createElement('div')
    wrapper.className = 'msg assistant loading-msg'
    wrapper.id = 'loading-message'
    const bubble = document.createElement('div')
    bubble.className = 'bubble loading-bubble'
    bubble.innerHTML = '<div class="loading-indicator"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div><span class="loading-text">답변을 준비하고 있어요...</span>'
    wrapper.appendChild(bubble)
    this.chatMessages.appendChild(wrapper)
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight
  }

  // 로딩 메시지 제거
  hideLoading() {
    const loadingMsg = document.getElementById('loading-message')
    if (loadingMsg) {
      loadingMsg.remove()
    }
  }

  // 로딩 상태 설정
  setLoading(isLoading) {
    this.sendBtn.disabled = isLoading
    this.userInput.disabled = isLoading
    this.sendBtn.textContent = isLoading ? '⏳ 전송중…' : '📤 전송'
    if (isLoading) {
      this.showLoading()
    } else {
      this.hideLoading()
    }
  }

  // 메시지 전송 처리
  handleSubmit(text) {
    const query = (text ?? this.userInput.value).trim()
    if (!query) return
    this.appendMessage('user', query)
    this.userInput.value = ''
    this.setLoading(true)
    
    // 로딩 후 응답 처리 (로컬 추천은 약간의 딜레이를 주어 자연스럽게)
    const delay = USE_LOCAL_RECO ? 800 : 0
    setTimeout(() => {
      requestRecommendation(query)
        .then((answer) => {
          this.hideLoading()
          this.appendMessage('assistant', answer)
        })
        .catch((err) => {
          this.hideLoading()
          this.appendMessage('assistant', `❌ 오류: ${err.message}\n\n다시 시도해주시거나 다른 질문을 해주세요.`)
        })
        .finally(() => {
          this.setLoading(false)
          this.userInput.focus()
        })
    }, delay)
  }
}

// 유틸리티 함수들 export
export { parseQuery, localRecommend, requestRecommendation, getSystemPrompt, USE_LOCAL_RECO, API_KEY_VAR }

