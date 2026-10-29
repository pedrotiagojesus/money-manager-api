export function verificationEmail(name: string, link: string) {
  return {
    subject: 'Confirma o teu email no Money Manager',
    text: [
      `Olá ${name},`,
      '',
      'Para confirmares o teu email, abre este link (válido durante 24 horas):',
      link,
      '',
      'Se não criaste esta conta, podes ignorar este email.',
    ].join('\n'),
  };
}
