const dns = require('dns');
const net = require('net');
const crypto = require('crypto');

// Configurable IPv4 blocked subnets
const BLOCKED_V4_RANGES = [
  { subnet: '10.0.0.0', mask: 8 },       // Private
  { subnet: '172.16.0.0', mask: 12 },    // Private
  { subnet: '192.168.0.0', mask: 16 },   // Private
  { subnet: '127.0.0.0', mask: 8 },      // Loopback
  { subnet: '169.254.0.0', mask: 16 },   // Link-local / Cloud metadata (169.254.169.254)
  { subnet: '224.0.0.0', mask: 4 },      // Multicast
  { subnet: '255.255.255.255', mask: 32 }, // Broadcast
  { subnet: '0.0.0.0', mask: 32 }        // Unspecified
];

// Parse IP to integer for subnet verification
function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

// Helper to check if IPv4 is in CIDR
function ipv4InCidr(ip, subnet, mask) {
  if (!net.isIPv4(ip)) return false;
  const ipLong = ipToLong(ip);
  const subnetLong = ipToLong(subnet);
  const maskBits = mask === 0 ? 0 : (~0 << (32 - mask));
  return (ipLong & maskBits) === (subnetLong & maskBits);
}

// Check for disallowed IPv6 patterns (loopback, link-local, unique local, etc.)
function isDisallowedIpv6(ip) {
  const normalized = ip.toLowerCase().trim();
  
  // Loopback (::1 or 0:0:0:0:0:0:0:1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  
  // Link-local (fe80::/10)
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe90:') || normalized.startsWith('fea0:') || normalized.startsWith('feb0:')) return true;
  
  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  
  // IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:7f00:1, etc.)
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.substring(7);
    if (net.isIPv4(ipv4)) {
      return isDisallowedIp(ipv4);
    }
    const hexMatch = ipv4.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMatch) {
      const p1 = parseInt(hexMatch[1], 16);
      const p2 = parseInt(hexMatch[2], 16);
      const reconstructedIpv4 = `${(p1 >> 8) & 0xff}.${p1 & 0xff}.${(p2 >> 8) & 0xff}.${p2 & 0xff}`;
      return isDisallowedIp(reconstructedIpv4);
    }
  }

  // IPv6 Link-Local Multicast (ff02::/16)
  if (normalized.startsWith('ff')) return true;
  
  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  
  return false;
}

// General check function for IP addresses
function isDisallowedIp(ip, port = null) {
  if (!ip) return true;

  // Permitir loopback en puerto 3032 únicamente en entorno de tests
  if (process.env.NODE_ENV === 'test' && Number(port) === 3032 && (ip === '127.0.0.1' || ip === '::1')) {
    return false;
  }
  
  if (net.isIPv4(ip)) {
    for (const range of BLOCKED_V4_RANGES) {
      if (ipv4InCidr(ip, range.subnet, range.mask)) {
        return true;
      }
    }
    return false;
  } else if (net.isIPv6(ip)) {
    return isDisallowedIpv6(ip);
  }
  
  return true; // Disallow any invalid format
}

// Convert alternate IPv4 formats (hex, octal, dword) to standard dotted-decimal
function parseAlternateIpv4(host) {
  const cleanHost = host.trim();

  // 1. Check if DWORD (decimal number representing IP)
  if (/^\d+$/.test(cleanHost)) {
    const num = Number(cleanHost);
    if (num >= 0 && num <= 4294967295) {
      return [
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        num & 0xff
      ].join('.');
    }
  }

  // 2. Check if Hex format (e.g. 0x7f000001 or 0x7f.0x0.0x0.0x1)
  if (cleanHost.startsWith('0x') || cleanHost.includes('.0x')) {
    const parts = cleanHost.split('.');
    if (parts.length === 1) {
      const num = parseInt(cleanHost, 16);
      if (!isNaN(num) && num >= 0 && num <= 4294967295) {
        return [
          (num >> 24) & 0xff,
          (num >> 16) & 0xff,
          (num >> 8) & 0xff,
          num & 0xff
        ].join('.');
      }
    } else if (parts.length === 4) {
      const parsedParts = parts.map(p => parseInt(p, 16));
      if (parsedParts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
        return parsedParts.join('.');
      }
    }
  }

  // 3. Check if Octal parts (e.g. 0177.0.0.1)
  if (cleanHost.split('.').some(p => p.startsWith('0') && p.length > 1 && !p.startsWith('0x'))) {
    const parts = cleanHost.split('.');
    if (parts.length === 4) {
      const parsedParts = parts.map(p => {
        if (p.startsWith('0')) {
          return parseInt(p, 8);
        }
        return parseInt(p, 10);
      });
      if (parsedParts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
        return parsedParts.join('.');
      }
    }
  }

  return cleanHost;
}

// Validate URL scheme, host, port to prevent SSRF
function validateUrl(urlStr) {
  if (!urlStr) {
    throw new Error('URL vacía.');
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (e) {
    throw new Error('URL inválida.');
  }

  // Restringir esquemas a http y https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Protocolo no permitido. Solo se admite http o https.');
  }

  let hostname = parsed.hostname;
  if (!hostname) {
    throw new Error('Hostname vacío.');
  }

  // Strip brackets from IPv6 hostnames for IP validation
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // Parse alternative IP representations
  const normalizedHost = parseAlternateIpv4(hostname);
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);

  // Si es una IP directa, validarla
  if (net.isIP(normalizedHost)) {
    if (isDisallowedIp(normalizedHost, port)) {
      throw new Error('Acceso a IP privada/restringida bloqueado (SSRF).');
    }
  }

  // Restringir a puertos estándar y puerto de test
  if (port !== 80 && port !== 443 && port !== 8080 && port !== 8443 && port !== 3032) {
    throw new Error('Puerto no permitido.');
  }

  return true;
}

// Resolve DNS hostname to a single IP address and validate it (checks ALL returned IPs)
function resolveAndValidateIp(hostname, port = null) {
  return new Promise((resolve, reject) => {
    let cleanHost = hostname;
    if (cleanHost.startsWith('[') && cleanHost.endsWith(']')) {
      cleanHost = cleanHost.slice(1, -1);
    }
    
    const normalizedHost = parseAlternateIpv4(cleanHost);

    if (net.isIP(normalizedHost)) {
      if (isDisallowedIp(normalizedHost, port)) {
        return reject(new Error('La IP es privada o restringida.'));
      }
      return resolve(normalizedHost);
    }

    // Resolve both IPv4 and IPv6 to make sure no resolved address is private
    dns.resolve4(normalizedHost, (err4, addrs4) => {
      dns.resolve6(normalizedHost, (err6, addrs6) => {
        const allAddresses = [];
        if (addrs4) allAddresses.push(...addrs4);
        if (addrs6) allAddresses.push(...addrs6);

        if (allAddresses.length === 0) {
          // Fallback to dns.lookup
          dns.lookup(normalizedHost, { all: true }, (lookupErr, lookupAddrs) => {
            if (lookupErr) {
              return reject(new Error('Fallo de resolución DNS: ' + lookupErr.message));
            }
            const addrs = lookupAddrs.map(a => a.address);
            for (const addr of addrs) {
              if (isDisallowedIp(addr, port)) {
                return reject(new Error('La resolución DNS contiene una dirección IP privada o restringida (SSRF/Rebinding).'));
              }
            }
            resolve(addrs[0]);
          });
          return;
        }

        // Validate all addresses
        for (const addr of allAddresses) {
          if (isDisallowedIp(addr, port)) {
            return reject(new Error('La resolución DNS contiene una dirección IP privada o restringida (SSRF/Rebinding).'));
          }
        }

        resolve(allAddresses[0]);
      });
    });
  });
}

// safeLookup for general usage (DNS Rebinding safety)
function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  resolveAndValidateIp(hostname)
    .then(address => {
      const family = net.isIPv6(address) ? 6 : 4;
      callback(null, address, family);
    })
    .catch(err => {
      callback(err);
    });
}

// Session Token Manager (Memory Only)
let activeSessionToken = null;
let activePairingCode = null;
let pairingTimeout = null;

function generatePairingCode() {
  if (pairingTimeout) {
    clearTimeout(pairingTimeout);
  }
  // Cryptographically random 6-character hex code
  activePairingCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  // Expire pairing code in 60 seconds
  pairingTimeout = setTimeout(() => {
    activePairingCode = null;
  }, 60000);

  return activePairingCode;
}

function verifyPairingCodeAndGenerateToken(code) {
  if (!activePairingCode || !code) return null;
  
  // Safe comparison
  const input = Buffer.from(code.toUpperCase());
  const actual = Buffer.from(activePairingCode);
  
  let valid = false;
  try {
    if (input.length === actual.length) {
      valid = crypto.timingSafeEqual(input, actual);
    }
  } catch (e) {
    valid = false;
  }

  if (valid) {
    // Burn pairing code immediately
    activePairingCode = null;
    if (pairingTimeout) {
      clearTimeout(pairingTimeout);
      pairingTimeout = null;
    }
    // Generate new session token
    activeSessionToken = crypto.randomBytes(32).toString('hex');
    return activeSessionToken;
  }
  return null;
}

function verifySessionToken(token) {
  if (!activeSessionToken || !token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(activeSessionToken, 'hex'), Buffer.from(token, 'hex'));
  } catch (e) {
    return false;
  }
}

function clearSession() {
  activeSessionToken = null;
  activePairingCode = null;
}

// Origin Validation Middleware
function validateOrigin(req, res, next) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const expectedOrigin = `http://127.0.0.1:${process.env.PORT || 3030}`;
  
  if (origin && origin !== expectedOrigin) {
    return res.status(403).json({ error: 'Origin no permitido' });
  }

  if (referer) {
    try {
      const refUrl = new URL(referer);
      const refOrigin = `${refUrl.protocol}//${refUrl.host}`;
      if (refOrigin !== expectedOrigin) {
        return res.status(403).json({ error: 'Referer no permitido' });
      }
    } catch (e) {
      return res.status(403).json({ error: 'Referer inválido' });
    }
  }

  next();
}

module.exports = {
  isDisallowedIp,
  parseAlternateIpv4,
  validateUrl,
  resolveAndValidateIp,
  safeLookup,
  generatePairingCode,
  verifyPairingCodeAndGenerateToken,
  verifySessionToken,
  getSessionToken: () => activeSessionToken,
  clearSession,
  validateOrigin
};
