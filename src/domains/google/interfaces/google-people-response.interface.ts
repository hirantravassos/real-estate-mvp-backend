export interface GooglePersonConnection {
  resourceName: string;
  names?: { displayName: string }[];
  emailAddresses?: { value: string }[];
  phoneNumbers?: { value: string }[];
  photos?: { url: string }[];
}

export interface GooglePeopleConnectionsResponse {
  connections?: GooglePersonConnection[];
}
