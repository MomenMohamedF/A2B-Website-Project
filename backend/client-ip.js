async function cloudClientIp(request){return request.headers.get('CF-Connecting-IP')||'unknown';}
