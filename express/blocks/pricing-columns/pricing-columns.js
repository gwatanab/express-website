/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-disable no-underscore-dangle */

import {
  addPublishDependencies,
  createTag,
  getHelixEnv,
  getOffer,
  getIcon,
} from '../../scripts/scripts.js';

function replaceUrlParam(url, paramName, paramValue) {
  const params = url.searchParams;
  params.set(paramName, paramValue);
  url.search = params.toString();
  return url;
}

export function buildUrl(optionUrl, country, language) {
  const currentUrl = new URL(window.location.href);
  let planUrl = new URL(optionUrl);

  if (!planUrl.hostname.includes('commerce')) {
    return planUrl.href;
  }
  planUrl = replaceUrlParam(planUrl, 'co', country);
  planUrl = replaceUrlParam(planUrl, 'lang', language);
  let rUrl = planUrl.searchParams.get('rUrl');
  if (currentUrl.searchParams.has('host')) {
    const hostParam = currentUrl.searchParams.get('host');
    if (hostParam === 'spark.adobe.com') {
      planUrl.hostname = 'commerce.adobe.com';
      if (rUrl) rUrl = rUrl.replace('spark.adobe.com', hostParam);
    } else if (hostParam.includes('qa.adobeprojectm.com')) {
      planUrl.hostname = 'commerce.adobe.com';
      if (rUrl) rUrl = rUrl.replace('spark.adobe.com', hostParam);
    } else if (hostParam.includes('.adobeprojectm.com')) {
      planUrl.hostname = 'commerce-stg.adobe.com';
      if (rUrl) rUrl = rUrl.replace('adminconsole.adobe.com', 'stage.adminconsole.adobe.com');
      if (rUrl) rUrl = rUrl.replace('spark.adobe.com', hostParam);
    }
  }

  const env = getHelixEnv();
  if (env && env.commerce && planUrl.hostname.includes('commerce')) planUrl.hostname = env.commerce;
  if (env && env.spark && rUrl) {
    const url = new URL(rUrl);
    url.hostname = env.spark;
    rUrl = url.toString();
  }

  if (rUrl) {
    rUrl = new URL(rUrl);

    if (currentUrl.searchParams.has('touchpointName')) {
      rUrl = replaceUrlParam(rUrl, 'touchpointName', currentUrl.searchParams.get('touchpointName'));
    }
    if (currentUrl.searchParams.has('destinationUrl')) {
      rUrl = replaceUrlParam(rUrl, 'destinationUrl', currentUrl.searchParams.get('destinationUrl'));
    }
    if (currentUrl.searchParams.has('srcUrl')) {
      rUrl = replaceUrlParam(rUrl, 'srcUrl', currentUrl.searchParams.get('srcUrl'));
    }
  }

  if (currentUrl.searchParams.has('code')) {
    planUrl.searchParams.set('code', currentUrl.searchParams.get('code'));
  }

  if (currentUrl.searchParams.get('rUrl')) {
    rUrl = currentUrl.searchParams.get('rUrl');
  }

  if (rUrl) planUrl.searchParams.set('rUrl', rUrl.toString());
  return planUrl.href;
}

function decorateIconList($pricingRight) {
  let $iconList = createTag('div', { class: 'pricing-iconlist' });
  let $iconListDescription;
  [...$pricingRight.firstChild.childNodes].forEach(($e) => {
    const $img = $e.querySelector('img.icon, svg.icon');
    if ($img) {
      const $iconListRow = createTag('div');
      const $iconDiv = createTag('div', { class: 'pricing-iconlist-icon' });
      $iconDiv.appendChild($img);
      $iconListRow.append($iconDiv);
      $iconListDescription = createTag('div', { class: 'pricing-iconlist-description' });
      $iconListRow.append($iconListDescription);
      $iconListDescription.appendChild($e);
      $iconList.appendChild($iconListRow);
    } else {
      if ($iconList.children.length > 0) {
        $pricingRight.appendChild($iconList);
        $iconList = createTag('div', { class: 'pricing-iconlist' });
      }
      $pricingRight.appendChild($e);
    }
  });
  if ($iconList.children.length > 0) $pricingRight.appendChild($iconList);
}

async function selectPlan($pricingHeader, planUrl) {
  const link = new URL(planUrl);
  const params = link.searchParams;

  const plan = {
    url: planUrl,
    country: 'us',
    language: 'en',
    offerId: params.get('items[0][id]'),
    price: '9.99',
    currency: 'US',
    symbol: '$',
  };

  const countryOverride = new URLSearchParams(window.location.search).get('country');
  const offer = await getOffer(plan.offerId, countryOverride);

  if (offer) {
    plan.currency = offer.currency;
    plan.price = offer.unitPrice;
    plan.formatted = `${offer.unitPriceCurrencyFormatted}`;
    plan.country = offer.country;
    plan.language = offer.lang;
    plan.rawPrice = offer.unitPriceCurrencyFormatted.match(/[\d|,|.|e|E|+]+/g);
    plan.formatted = plan.formatted.replace(plan.rawPrice, `<strong>${plan.rawPrice}<strong>`);
  }

  $pricingHeader.querySelector('.pricing-columns-price').innerHTML = plan.formatted;
  $pricingHeader.querySelector('.pricing-columns-cta').href = buildUrl(plan.url, plan.country, plan.language);
}

function decoratePlan($column) {
  const $elements = Array.from($column.children);
  const $pricingHeader = createTag('div', { class: 'pricing-columns-header' });
  const $pricingTitle = createTag('h3', { class: 'pricing-columns-title' });
  const plans = [];

  $elements.forEach(($element) => {
    if ($element.classList.contains('button-container')) {
      const $link = $element.querySelector('a');
      plans.push({
        name: $link.innerText,
        url: $link.href,
      });
    }
  });

  $pricingTitle.innerHTML = $elements[0].innerHTML;
  $pricingHeader.append($pricingTitle);

  if (plans) {
    const $pricingPrice = createTag('span', { class: 'pricing-columns-price' });
    $pricingHeader.append($pricingPrice);

    if (plans.length > 1) {
      const $pricingDropdown = createTag('select', { class: 'pricing-columns-dropdown' });

      $pricingDropdown.addEventListener('change', () => {
        selectPlan($pricingHeader, $pricingDropdown.value);
      });

      plans.forEach((plan) => {
        const $option = createTag('option', { value: plan.url });
        $option.innerHTML = plan.name;
        $pricingDropdown.prepend($option);
      });

      $pricingHeader.append($pricingDropdown);
    }

    const $pricingCta = createTag('a', { class: 'pricing-columns-cta button large' });
    $pricingCta.innerHTML = $elements[1].innerHTML;
    $pricingCta.href = plans[0].url;
    $pricingHeader.append($pricingCta);

    selectPlan($pricingHeader, plans[0].url);
  }

  if (!$elements[$elements.length - 1].classList.contains('button-container')) {
    $pricingHeader.append($elements[$elements.length - 1]);
  }

  return $pricingHeader;
}

function decoratePricingColumns($block) {
  const $rows = Array.from($block.children);
  $block.innerHTML = '';

  Array.from($rows[0].children).forEach(($column) => {
    if ($column.innerHTML) {
      const $pricingColumnsHeader = decoratePlan($column);
      $block.append($pricingColumnsHeader);
    }
  });

  Array.from($rows[1].children).forEach(($column) => {
    if ($column.innerHTML.length) {
      const $pricingColumnsContent = createTag('div', { class: 'pricing-columns-content' });
      $pricingColumnsContent.innerHTML = $column.innerHTML;
      $block.append($pricingColumnsContent);
    }
  });
}

export default function decorate($block) {
  decoratePricingColumns($block);
}
