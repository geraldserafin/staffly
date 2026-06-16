import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** A Laravel resource collection: `{ data: [...] }`. */
interface Collection<T> {
  data: T[];
}

/** A single Laravel resource: `{ data: {...} }`. */
interface Resource<T> {
  data: T;
}

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Thin typed wrapper over HttpClient: prefixes the API origin, unwraps Laravel's
 * `{ data }` envelope, and centralises the verbs the feature services build on.
 * Endpoints that return bare JSON (solve preview, insights) use the *Raw helpers.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  list<T>(path: string, query?: Query): Observable<T[]> {
    return this.http
      .get<Collection<T>>(this.url(path), { params: this.params(query) })
      .pipe(map((r) => r.data));
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<Resource<T>>(this.url(path)).pipe(map((r) => r.data));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<Resource<T>>(this.url(path), body ?? {}).pipe(map((r) => r.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<Resource<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<Resource<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(this.url(path));
  }

  /** For endpoints that return un-enveloped JSON (preview, insights). */
  getRaw<T>(path: string): Observable<T> {
    return this.http.get<T>(this.url(path));
  }

  postRaw<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {});
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  private params(query?: Query): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
