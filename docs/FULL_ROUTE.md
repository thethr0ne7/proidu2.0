# Full route contract

## Input

- ЕГЭ score for every selected subject;
- compatible programs returned by the live federal search;
- achievement facts: honors document, volunteering and GTO level;
- admission year;
- optional university, city and region filters.

## Current algorithm

1. Revalidate the chosen programs against individual subject scores.
2. Check mandatory ЕГЭ minimums.
3. Select the strongest eligible exam from every alternative group.
4. Calculate a program-specific ЕГЭ total.
5. Calculate achievement points independently for every university and cap them at 10.
6. Compare the effective score with the latest verified historical budget cutoff.
7. Assign a band: ambitious, realistic, safe, no history or below.
8. First select different universities and cities.
9. Add remaining positions with a maximum of two programs per university.
10. Attach verified deadlines and document requirements.
11. Emit warnings for every missing data layer.

## Important boundary

The generated order is a developer risk-diversification order. A paid production route must additionally collect the applicant's personal preference order, relocation limits, quotas, target admission and tuition limits. Historical cutoffs never guarantee admission.
