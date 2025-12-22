/**
 * Cloudflare Function: 솔라피 SMS 발송 API
 * 
 * 환경 변수 필요:
 * - SOLAPI_API_KEY: 솔라피 API Key
 * - SOLAPI_API_SECRET: 솔라피 API Secret
 * - SOLAPI_SENDER: 발신번호 (예: 010-9079-4624)
 * - ADMIN_PHONE: 관리자 수신번호 (예약 알림 받을 번호)
 */

/**
 * HMAC-SHA256 시그니처 생성
 * @param {string} apiSecret - API Secret Key
 * @param {string} dateTime - ISO 8601 형식의 날짜/시간
 * @param {string} salt - 랜덤 salt 값
 * @returns {Promise<string>} - 생성된 signature (hex 형식)
 */
async function generateSignature(apiSecret, dateTime, salt) {
  const data = dateTime + salt;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(data);
  
  // HMAC-SHA256 생성
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // ArrayBuffer를 hex 문자열로 변환
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * 랜덤 salt 생성 (16바이트 hex)
 * @returns {string} - 랜덤 salt 값
 */
function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 솔라피 API 인증 헤더 생성
 * @param {string} apiKey - API Key
 * @param {string} apiSecret - API Secret
 * @returns {Promise<string>} - Authorization 헤더 값
 */
async function createAuthHeader(apiKey, apiSecret) {
  const dateTime = new Date().toISOString();
  const salt = generateSalt();
  const signature = await generateSignature(apiSecret, dateTime, salt);
  
  return `HMAC-SHA256 apiKey=${apiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 환경 변수 확인
    const missingVars = [];
    if (!env.SOLAPI_API_KEY) missingVars.push('SOLAPI_API_KEY');
    if (!env.SOLAPI_API_SECRET) missingVars.push('SOLAPI_API_SECRET');
    if (!env.SOLAPI_SENDER) missingVars.push('SOLAPI_SENDER');
    if (!env.ADMIN_PHONE) missingVars.push('ADMIN_PHONE');
    
    if (missingVars.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '서버 설정이 완료되지 않았습니다.',
          missing: missingVars
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 요청 데이터 파싱
    const formData = await request.json();
    const { name, phone, date, time, address, note } = formData;

    // 필수 필드 검증
    if (!name || !phone || !date || !time) {
      return new Response(
        JSON.stringify({ success: false, error: '필수 항목을 모두 입력해주세요.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 전화번호 포맷 정리 (하이픈 제거)
    const cleanPhone = phone.replace(/[-\s]/g, '');
    const cleanAdminPhone = env.ADMIN_PHONE.replace(/[-\s]/g, '');
    const cleanSender = env.SOLAPI_SENDER.replace(/[-\s]/g, '');

    // 문자 메시지 내용 작성
    const message = `[Hillstay 방문 예약 신청]

성함: ${name}
연락처: ${phone}
방문 날짜: ${date}
방문 시간: ${time}
거주 지역: ${address || '미입력'}
문의사항: ${note || '없음'}

예약 신청이 접수되었습니다.`;

    // 솔라피 API 엔드포인트
    const solapiUrl = 'https://api.solapi.com/messages/v4/send-many/detail';
    
    // 솔라피 API 요청 본문
    const solapiBody = {
      messages: [
        {
          to: cleanAdminPhone,
          from: cleanSender,
          text: message,
        }
      ],
    };
    
    console.log('=== 솔라피 API 요청 정보 ===');
    console.log('URL:', solapiUrl);
    console.log('수신번호:', cleanAdminPhone);
    console.log('발신번호:', cleanSender);
    console.log('요청 본문:', JSON.stringify(solapiBody, null, 2));

    // HMAC-SHA256 인증 헤더 생성
    const authHeader = await createAuthHeader(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);
    console.log('인증 헤더 생성 완료');

    // 솔라피 API 호출
    const solapiResponse = await fetch(solapiUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(solapiBody),
    });

    const solapiResult = await solapiResponse.json();
    console.log('솔라피 API 응답:', {
      status: solapiResponse.status,
      ok: solapiResponse.ok,
      result: solapiResult,
    });

    if (!solapiResponse.ok) {
      console.error('솔라피 API 오류:', solapiResult);
      console.error('요청 본문:', JSON.stringify(solapiBody, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
          details: solapiResult.errorMessage || JSON.stringify(solapiResult),
          debug: {
            requestBody: solapiBody,
            solapiError: solapiResult
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 성공 응답
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '예약 신청이 완료되었습니다. 곧 연락드리겠습니다.' 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('서버 오류:', error);
    console.error('에러 스택:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

