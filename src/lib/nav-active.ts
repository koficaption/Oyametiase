export type ParsedNavHref = {
  pathname: string;
  search: URLSearchParams;
  hash: string;
};

export function parseNavHref(href: string): ParsedNavHref {
  const hashIndex = href.indexOf("#");
  const withoutHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex + 1);
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : withoutHash.slice(queryIndex + 1);
  return { pathname, search: new URLSearchParams(query), hash };
}

function queryMatches(required: URLSearchParams, current: URLSearchParams) {
  return [...required.entries()].every(([key, value]) => current.get(key) === value);
}

function siblingMatchesCurrent(
  sibling: ParsedNavHref,
  pathname: string,
  current: URLSearchParams,
) {
  if (sibling.pathname !== pathname) return false;
  if ([...sibling.search.keys()].length > 0) {
    return queryMatches(sibling.search, current);
  }
  if (sibling.hash) {
    return current.get("section") === sibling.hash;
  }
  return false;
}

/** True when this nav item is the best match for the current URL. */
export function isNavActive(
  href: string,
  pathname: string,
  search = "",
  siblingHrefs: string[] = [],
) {
  const target = parseNavHref(href);
  const current = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const siblings = siblingHrefs.map(parseNavHref);
  const targetHasFilter = [...target.search.keys()].length > 0 || Boolean(target.hash);

  if (pathname === target.pathname) {
    if (targetHasFilter) {
      if (target.hash) return current.get("section") === target.hash;
      return queryMatches(target.search, current);
    }
    return !siblings.some((sibling) => siblingMatchesCurrent(sibling, pathname, current));
  }

  if (!pathname.startsWith(`${target.pathname}/`) || targetHasFilter) {
    return false;
  }

  const betterChild = siblings.some((sibling) => {
    if (sibling.pathname === target.pathname) return false;
    return (
      (pathname === sibling.pathname || pathname.startsWith(`${sibling.pathname}/`)) &&
      sibling.pathname.length > target.pathname.length
    );
  });

  return !betterChild;
}
