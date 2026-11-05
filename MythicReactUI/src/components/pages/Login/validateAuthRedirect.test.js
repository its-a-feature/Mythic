import {validateAuthRedirect} from './validateAuthRedirect';

test.each(['https://idp.example/login?state=a%20b#next', 'http://localhost:8080/login'])(
    'accepts absolute web redirect %s', value => expect(validateAuthRedirect(value)).toBe(value),
);
test.each(['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>',
    '//idp.example/login', '/login', 'https:login', 'https:///login', ' https://idp.example',
    'https://idp.example\\@evil.example', 'https://user:password@idp.example', null, 123, ''])(
    'rejects unsafe redirect %s', value => expect(() => validateAuthRedirect(value)).toThrow(),
);
