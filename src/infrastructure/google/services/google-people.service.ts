import {
  BadGatewayException,
  Injectable,
  Logger,
  BadRequestException,
} from "@nestjs/common";

const PEOPLE_API_URL = "https://people.googleapis.com/v1/people/me/connections";
const PAGE_SIZE = 1000;
const MAXIMUM_PAGES = 10;
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

export interface GoogleContact {
  name: string | null;
  phones: string[];
}

interface ConnectionsResponse {
  connections?: {
    names?: { displayName?: string; metadata?: { primary?: boolean } }[];
    phoneNumbers?: { value?: string; canonicalForm?: string }[];
  }[];
  nextPageToken?: string;
}

/**
 * Reads the broker's Google contacts with the access token the browser got
 * from Google (contacts.readonly scope). The token is used once and never stored.
 */
@Injectable()
export class GooglePeopleService {
  private readonly logger = new Logger(GooglePeopleService.name);

  async listContacts(accessToken: string): Promise<GoogleContact[]> {
    const contacts: GoogleContact[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MAXIMUM_PAGES; page++) {
      const url = new URL(PEOPLE_API_URL);
      url.searchParams.set("personFields", "names,phoneNumbers");
      url.searchParams.set("pageSize", String(PAGE_SIZE));
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      }).catch((error: unknown) => {
        this.logger.error(`Google People unreachable: ${String(error)}`);
        throw new BadGatewayException(
          "O Google não respondeu agora, tente de novo.",
        );
      });

      if (response.status === 401 || response.status === 403) {
        throw new BadRequestException(
          "O Google não liberou os contatos. Entre de novo e marque a permissão de contatos.",
        );
      }
      if (!response.ok) {
        this.logger.error(
          `Google People answered ${response.status}: ${(await response.text()).substring(0, 300)}`,
        );
        throw new BadGatewayException(
          "O Google não entregou os contatos, tente de novo.",
        );
      }

      const body = (await response.json()) as ConnectionsResponse;
      for (const person of body.connections ?? []) {
        const names = person.names ?? [];
        const name =
          names.find((item) => item.metadata?.primary)?.displayName ??
          names[0]?.displayName ??
          null;
        const phones = (person.phoneNumbers ?? [])
          .map((phone) => phone.canonicalForm ?? phone.value ?? "")
          .filter(Boolean);
        if (phones.length)
          contacts.push({ name: name?.trim() || null, phones });
      }

      pageToken = body.nextPageToken;
      if (!pageToken) break;
    }

    return contacts;
  }
}
