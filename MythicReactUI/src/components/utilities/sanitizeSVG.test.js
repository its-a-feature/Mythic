/* eslint-disable no-script-url -- Security fixtures deliberately include active URL schemes. */
import {sanitizeSVG, sanitizeSVGMarkup} from './sanitizeSVG';

const parse = markup => new DOMParser().parseFromString(markup, 'image/svg+xml');
const wrap = content => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">${content}</svg>`;

test('preserves vector geometry, viewBox, styling, gradients, clipping and local use references', () => {
    const result = parse(sanitizeSVGMarkup(wrap(`
        <defs>
            <linearGradient id="paint"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient>
            <clipPath id="clip"><circle cx="50" cy="50" r="40"/></clipPath>
            <path id="shape" d="M0 0 L100 0 L50 100 Z"/>
        </defs>
        <style>.logo { fill: url(#paint); }</style>
        <g transform="translate(1 2)" clip-path="url(#clip)">
            <use href="#shape" class="logo"/>
            <use xlink:href="#shape" style="fill: url(#paint); stroke: black"/>
        </g>`)));
    expect(result.querySelector('parsererror')).toBeNull();
    expect(result.documentElement.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(result.querySelector('linearGradient').id).toBe('paint');
    expect(result.querySelector('clipPath').id).toBe('clip');
    expect(result.querySelector('path').getAttribute('d')).toBe('M0 0 L100 0 L50 100 Z');
    expect(result.querySelector('style').textContent).toContain('.logo');
    expect(result.querySelector('g').getAttribute('transform')).toBe('translate(1 2)');
    expect(result.querySelector('use').getAttribute('href')).toBe('#shape');
    expect(result.querySelectorAll('use')[1].getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#shape');
});

test('removes scripts, mixed-case handlers, embedded HTML and attribute-changing animations', () => {
    const result = parse(sanitizeSVGMarkup(wrap(`
        <script>alert(1)</script><g onload="alert(1)" ONCLICK="alert(1)"><path d="M0 0L10 10"/></g>
        <foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/></div></foreignObject>
        <set attributeName="onload" to="alert(1)"/><animate attributeName="href" values="javascript:alert(1)"/>
        <a href="javascript:alert(1)"><text>logo</text></a>`)));
    expect(result.querySelector('script, foreignObject, set, animate')).toBeNull();
    for (const element of result.querySelectorAll('*')) {
        expect(element.getAttributeNames().some(name => name.toLowerCase().startsWith('on'))).toBe(false);
    }
    expect(result.querySelector('a').hasAttribute('href')).toBe(false);
    expect(result.querySelector('path')).not.toBeNull();
});

test.each(['https://attacker.example/logo.svg#shape', '//attacker.example/logo.svg#shape', '/logo.svg#shape', 'data:image/svg+xml,<svg/>', 'javascript:alert(1)'])(
    'removes nonlocal href %s', href => {
        const result = parse(sanitizeSVGMarkup(wrap(`<use href="${href.replace(/</g, '&lt;')}"/>`)));
        expect(result.querySelector('use').hasAttribute('href')).toBe(false);
    },
);

test('removes XML stylesheet instructions and base URLs', () => {
    const result = sanitizeSVGMarkup(`<?xml-stylesheet href="https://attacker.example/style.css"?>${wrap('<g xml:base="https://attacker.example/"><use href="#shape"/></g>')}`);
    expect(result).not.toContain('xml-stylesheet');
    expect(result).not.toContain('xml:base');
});

test.each(['<svg><broken></svg>', '<html xmlns="http://www.w3.org/1999/xhtml"/>', '<svg xmlns="urn:wrong"/>'])(
    'rejects malformed or non-SVG documents', markup => expect(() => sanitizeSVGMarkup(markup)).toThrow('Invalid SVG'),
);

test('keeps non-SVG image blobs unchanged', async () => {
    const blob = new Blob(['pixels'], {type: 'image/png'});
    expect(await sanitizeSVG(blob)).toBe(blob);
});

test('returns sanitized SVG bytes with the SVG MIME type', async () => {
    const blob = await sanitizeSVG({type: 'image/svg+xml; charset=utf-8', text: async () => wrap('<script>alert(1)</script><path d="M0 0L10 10"/>')});
    expect(blob.type).toBe('image/svg+xml');
    const text = await new Promise(resolve => {const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob);});
    expect(text).toContain('<path');
    expect(text).not.toContain('<script');
});
