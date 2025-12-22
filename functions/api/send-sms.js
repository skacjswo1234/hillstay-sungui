/**
 * Cloudflare Function: 솔라피 SMS 발송 API
 * 
 * 환경 변수 필요:
 * - SOLAPI_API_KEY: 솔라피 API Key
 * - SOLAPI_API_SECRET: 솔라피 API Secret
 * - SOLAPI_MEMBER_ID: 솔라피 Member ID (14자리 숫자)
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
    if (!env.SOLAPI_MEMBER_ID) missingVars.push('SOLAPI_MEMBER_ID');
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
    // 단일 메시지 발송: /messages/v4/send
    // 여러 메시지 발송: /messages/v4/send-many/detail
    const solapiUrl = 'https://api.solapi.com/messages/v4/send-many/detail';
    
    // memberId 확인 및 검증
    const memberIdRaw = env.SOLAPI_MEMBER_ID;
    const memberId = memberIdRaw ? String(memberIdRaw).trim() : '';
    
    // 디버깅: memberId 정보를 콘솔과 응답에 포함
    const memberIdDebug = {
      raw: memberIdRaw,
      rawType: typeof memberIdRaw,
      processed: memberId,
      length: memberId.length,
      isEmpty: !memberId,
      is14Chars: memberId.length === 14,
    };
    
    console.log('=== Member ID 디버깅 정보 ===');
    console.log('Raw 값:', memberIdRaw);
    console.log('Raw 타입:', typeof memberIdRaw);
    console.log('처리된 값:', memberId);
    console.log('길이:', memberId.length);
    console.log('14자리 여부:', memberId.length === 14);
    console.log('전체 디버그 객체:', JSON.stringify(memberIdDebug, null, 2));

    // 환경 변수가 없거나 비어있는 경우
    if (!memberId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Member ID 환경 변수가 설정되지 않았습니다.',
          details: `SOLAPI_MEMBER_ID 환경 변수를 확인해주세요. 현재 값: ${memberIdRaw || '(없음)'}`,
          debug: memberIdDebug
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 14자리 검증
    if (memberId.length !== 14) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Member ID가 올바르지 않습니다. 14자리 숫자여야 합니다.',
          details: `Member ID: "${memberId}", 길이: ${memberId.length}, 필요한 길이: 14`,
          debug: memberIdDebug
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 솔라피 API 요청 본문 (v4 형식)
    // 솔라피 API v4는 messages 배열 형식을 사용하며, memberId는 각 메시지 객체 안에 포함되어야 합니다
    const solapiBody = {
      messages: [
        {
          to: cleanAdminPhone,
          from: cleanSender,
          text: message,
          memberId: memberId, // 각 메시지 객체 안에 memberId 포함 (14자리 숫자)
        }
      ],
    };

    // 요청 본문 로그 (디버깅용)
    console.log('=== 솔라피 API 요청 정보 ===');
    console.log('URL:', solapiUrl);
    console.log('Member ID:', memberId);
    console.log('Member ID 길이:', memberId.length);
    console.log('수신번호:', cleanAdminPhone);
    console.log('발신번호:', cleanSender);
    console.log('요청 본문:', JSON.stringify(solapiBody, null, 2));

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
      console.error('요청 본문:', JSON.stringify(solapiBody, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
          details: solapiResult.error?.message || JSON.stringify(solapiResult),
          debug: {
            memberId: memberId,
            memberIdLength: memberId.length,
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

