// A fixed td monogram; only the large site logo receives a seasonal hat.
export const brandMonogram='<path class="brand-letters" fill="currentColor" d="M34 28C24 29 21 36 21 47V52C15 54 9 57 8 62C7 66 11 68 16 66L22 64V88C22 111 36 121 58 121C81 121 102 109 102 87V40C102 32 97 27 87 28V65C80 61 71 60 63 64C51 69 47 80 47 91C47 95 52 96 54 91C57 82 64 75 73 76C81 77 85 83 82 91C79 101 71 108 60 108C45 108 35 101 35 87V60C50 58 64 54 65 48C66 44 63 42 59 44C52 48 43 49 35 50V36C35 32 35 30 38 27Z"/><path class="brand-spark" fill="var(--accent,#eec4a0)" d="M77 7C79 16 81 18 90 20C81 22 79 24 77 33C75 24 73 22 64 20C73 18 75 16 77 7Z"/>';
const hats={
 halloween:'<path d="M21 34C27 22 25 8 48 5C36 14 43 21 43 27C56 25 63 28 59 32C49 39 27 44 15 40C8 37 12 34 21 34Z"/><path class="hat-band" d="M25 26 43 22 44 28 23 33Z"/>',
 tidal:'<path d="M17 28Q33 3 51 23L48 31Q31 39 17 28Z"/><path class="hat-band" d="M15 29Q33 36 51 27L53 33Q34 43 15 35Z"/>',
 village:'<path d="M18 31Q29 4 44 9Q53 12 54 22L47 24Q43 17 37 20L42 32Z"/><path class="hat-band" d="M16 31Q31 25 45 31L45 38Q30 33 16 39Z"/><circle cx="52" cy="24" r="5"/>',
 atlas:'<path d="M19 30 23 13Q33 8 45 13L48 29Q63 28 61 34Q33 44 10 37Q8 31 19 30Z"/><path class="hat-band" d="M21 24Q34 29 47 23L48 29Q34 35 20 30Z"/>',
 salon:'<path d="M12 30Q17 11 37 12Q54 12 55 25Q51 36 15 36Z"/><path class="hat-band" d="M17 32 48 29 47 36 18 39Z"/><path d="M33 13 32 6 38 5 39 13Z"/>',
 reading:'<path d="M7 23 32 10 61 19 35 33Z"/><path class="hat-band" d="M20 29 21 38Q34 42 47 35L46 27 35 33Z"/><path fill="none" stroke="currentColor" stroke-width="3" d="M56 21V39"/>',
 herbarium:'<path d="M19 30Q16 8 35 10Q48 10 48 29Q63 27 63 34Q49 44 10 39Q2 34 19 30Z"/><path class="hat-band" d="M19 25Q35 30 47 23L48 30Q33 35 19 31Z"/>',
 letters:'<path d="M13 23Q18 9 38 10Q52 12 54 23L45 31 19 31Z"/><path class="hat-band" d="M18 29 49 27 48 34 19 37Z"/><path d="M19 36Q41 45 55 32L48 32Z"/>',
 bookshop:'<path d="M20 29 22 13 47 11 50 28Q63 29 59 35Q34 44 10 38Q7 32 20 29Z"/><path class="hat-band" d="M21 22 49 21 50 28 20 30Z"/>',
 train:'<path d="M12 23Q17 9 40 9Q54 10 55 23L47 30 19 31Z"/><path class="hat-band" d="M18 27 50 25 49 33 19 36Z"/><path d="M19 36Q39 44 56 31L48 32Z"/><circle class="hat-band" cx="34" cy="19" r="3"/>',
 archive:'<path d="M9 24 31 9 58 18 35 32Z"/><path class="hat-band" d="M19 29 20 38Q35 41 47 33L46 27 35 32Z"/><path fill="none" stroke="currentColor" stroke-width="3" d="M55 20V37"/>',
 atelier:'<path d="M13 29Q15 10 35 11Q53 11 54 27L46 34 19 36Z"/><path class="hat-band" d="M17 31 48 27 48 34 18 39Z"/>'
};
export function brandHat(layout){const key=Object.hasOwn(hats,layout)?layout:'halloween';return `<g class="brand-hat" data-hat="${key}">${hats[key]}</g>`}
export function brandIconSVG(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#30263e"/><g transform="translate(17 5) scale(.84)" color="#f8f0e8">${brandMonogram}</g></svg>`}
