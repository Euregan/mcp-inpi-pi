/**
 * Adapte des handlers par méthode HTTP au format `{ fetch }` attendu par les
 * Vercel Functions sans framework (voir vercel.com/docs/functions/quickstart) :
 * les exports nommés GET/POST/DELETE ne sont reconnus que pour Next.js.
 */

type MethodHandlers = Record<string, (req: Request) => Response | Promise<Response>>;

export function methodRouter(handlers: MethodHandlers): {
  fetch: (req: Request) => Response | Promise<Response>;
} {
  return {
    fetch: (req) => {
      const handler = handlers[req.method];
      return handler ? handler(req) : new Response(null, { status: 405 });
    },
  };
}
