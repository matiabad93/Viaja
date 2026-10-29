import {secureAIGateway,type ViajaAIEnv} from '../../server/ai-gateway';
export const onRequest:PagesFunction<ViajaAIEnv> = async ({request,env}) =>
 secureAIGateway(request,env||{});
