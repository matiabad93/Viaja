import {secureAIGateway,type TupaAIEnv} from '../../server/ai-gateway';
export const onRequest:PagesFunction<TupaAIEnv> = async ({request,env}) =>
 secureAIGateway(request,env||{});
