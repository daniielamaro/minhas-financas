/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/alarme` | `/alarme`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/impostos` | `/impostos`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/lancar` | `/lancar`; params?: Router.UnknownInputParams; } | { pathname: `/+not-found`, params: Router.UnknownInputParams & {  } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/alarme` | `/alarme`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/impostos` | `/impostos`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/lancar` | `/lancar`; params?: Router.UnknownOutputParams; } | { pathname: `/+not-found`, params: Router.UnknownOutputParams & {  } };
      href: Router.RelativePathString | Router.ExternalPathString | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/alarme${`?${string}` | `#${string}` | ''}` | `/alarme${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/impostos${`?${string}` | `#${string}` | ''}` | `/impostos${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/lancar${`?${string}` | `#${string}` | ''}` | `/lancar${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString | Router.ExternalPathString | `/_sitemap` | `${'/(tabs)'}/alarme` | `/alarme` | `${'/(tabs)'}/impostos` | `/impostos` | `${'/(tabs)'}` | `/` | `${'/(tabs)'}/lancar` | `/lancar`; params?: Router.UnknownInputParams; } | `/+not-found${`?${string}` | `#${string}` | ''}` | { pathname: `/+not-found`, params: Router.UnknownInputParams & {  } };
    }
  }
}
