/**
 * Cloudflare Function: 솔라피 SMS 발송 API
 * 
 * 환경 변수 필요:
 * - SOLAPI_API_KEY: 솔라피 API Key
 * - SOLAPI_API_SECRET: 솔라피 API Secret
 * - SOLAPI_SENDER: 발신번호 (예: 010-9079-4624)
 * - ADMIN_PHONE: 관리자 수신번호 (예약 알림 받을 번호)
 */

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
    // 환경 변수 확인 (디버깅용)
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

    // 솔라피 API 호출
    const solapiUrl = 'https://api.solapi.com/messages/v4/send';
    
    // 솔라피 API 요청 본문 (v4 형식)
    const solapiBody = {
      message: {
        to: cleanAdminPhone,
        from: cleanSender,
        text: message,
      },
    };

    console.log('솔라피 API 호출 시작:', {
      url: solapiUrl,
      to: cleanAdminPhone,
      from: cleanSender,
    });

    // 솔라피 API 호출 (user 형식 인증 사용)
    // 솔라피 API는 user 형식: "user ApiKey:ApiSecret" 형식을 사용합니다
    const solapiResponse = await fetch(solapiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `user ${env.SOLAPI_API_KEY}:${env.SOLAPI_API_SECRET}`,
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
          details: solapiResult.error?.message || JSON.stringify(solapiResult)
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

