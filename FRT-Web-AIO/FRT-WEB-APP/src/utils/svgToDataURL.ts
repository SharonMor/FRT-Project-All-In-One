// svgToDataURL.ts
import React from 'react';
import ReactDOMServer from 'react-dom/server';

export const svgToDataURL = (svgElement: React.ReactElement): string => {
  const svgString = ReactDOMServer.renderToStaticMarkup(svgElement);
  const encodedData = encodeURIComponent(svgString);
  return `data:image/svg+xml;charset=utf-8,${encodedData}`;
};
