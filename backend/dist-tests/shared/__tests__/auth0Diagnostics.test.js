"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth0Diagnostics_1 = require("../auth0Diagnostics");
describe('shared/auth0Diagnostics', () => {
    describe('validateAuth0Config', () => {
        it('reports missing fields', () => {
            const issues = (0, auth0Diagnostics_1.validateAuth0Config)({}, { redirectUri: '' });
            expect(issues.join('\n')).toMatch(/Missing Auth0 domain/);
            expect(issues.join('\n')).toMatch(/Missing Auth0 client id/);
            expect(issues.join('\n')).toMatch(/Missing redirect URI/);
        });
    });
    describe('explainAuth0Failure', () => {
        it('explains callback URL mismatch with actionable steps', () => {
            const msg = (0, auth0Diagnostics_1.explainAuth0Failure)({
                type: 'error',
                params: {
                    error: 'access_denied',
                    error_description: 'Callback URL mismatch.',
                },
            }, { domain: 'example.auth0.com', clientId: 'abc' }, { redirectUri: 'http://localhost:8081' });
            expect(msg).toBeTruthy();
            expect(msg).toMatch(/callback url mismatch/i);
            expect(msg).toMatch(/http:\/\/localhost:8081/);
            expect(msg).toMatch(/Allowed Callback URLs/);
            expect(msg).toMatch(/Allowed Web Origins/);
            expect(msg).toMatch(/Allowed Logout URLs/);
        });
        it('explains "Service not found" as an audience/API Identifier misconfiguration', () => {
            const msg = (0, auth0Diagnostics_1.explainAuth0Failure)({
                type: 'error',
                params: {
                    error: 'access_denied',
                    error_description: 'Service not found: borgz.com',
                },
            }, { domain: 'example.auth0.com', clientId: 'abc', audience: 'borgz.com' }, { redirectUri: 'http://localhost:8081' });
            expect(msg).toBeTruthy();
            expect(msg).toMatch(/service not found/i);
            expect(msg).toMatch(/API Identifier/i);
            expect(msg).toMatch(/borgz\.com/);
        });
        it('returns null for non-error responses', () => {
            const msg = (0, auth0Diagnostics_1.explainAuth0Failure)({ type: 'success', params: {} }, { domain: 'x', clientId: 'y' }, { redirectUri: 'z' });
            expect(msg).toBeNull();
        });
    });
});
