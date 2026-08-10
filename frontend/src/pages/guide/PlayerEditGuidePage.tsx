import styles from './PlayerEditGuidePage.module.css';

const GUIDE_STEPS = [
  {
    title: 'Unite a un torneo',
    description:
      'Desde la pantalla Torneos, selecciona "Unirse a un torneo" para comenzar.',
    imageUrl: '/guides/player-edit/step-1.svg',
    imageAlt: 'Pantalla de torneos con el boton Unirse a un torneo resaltado',
  },
  {
    title: 'Ingresa el codigo del torneo',
    description:
      'Escribi el codigo que te compartieron en "Codigo del torneo" y selecciona "Enviar solicitud".',
    imageUrl: '/guides/player-edit/step-2.svg',
    imageAlt: 'Formulario para ingresar el codigo del torneo',
    note: 'La solicitud queda pendiente hasta que un administrador vincule tu usuario con tu jugador.',
  },
  {
    title: 'Entra al torneo',
    description:
      'Cuando tu solicitud haya sido aprobada, volve a Torneos y selecciona la tarjeta del torneo.',
    imageUrl: '/guides/player-edit/step-3.svg',
    imageAlt: 'Listado de torneos con una tarjeta de torneo resaltada',
  },
  {
    title: 'Abri la lista de jugadores',
    description:
      'Dentro del detalle del torneo, selecciona "Jugadores" para ver tu jugador vinculado.',
    imageUrl: '/guides/player-edit/step-4.svg',
    imageAlt: 'Detalle del torneo con la opcion Jugadores resaltada',
  },
  {
    title: 'Edita tu jugador',
    description:
      'Busca tu nombre o apodo y selecciona "Editar" en tu tarjeta de jugador.',
    imageUrl: '/guides/player-edit/step-5.svg',
    imageAlt: 'Lista de jugadores con el boton Editar resaltado',
  },
  {
    title: 'Elegi como queres verte',
    description:
      'Pega una URL publica en "Foto de perfil (URL)" o elegi un equipo favorito. Despues selecciona "Imagen" o "Equipo favorito" en la preferencia de visualizacion y guarda los cambios.',
    imageUrl: '/guides/player-edit/step-6.svg',
    imageAlt: 'Formulario de edicion con foto, equipo favorito y preferencia de visualizacion',
    note: 'La opcion Imagen usa la URL de tu foto. Equipo favorito muestra el escudo del equipo que elegiste.',
  },
] as const;

export function PlayerEditGuidePage() {
  return (
    <main className={styles.guidePage}>
      <header className={styles.hero}>
        <img alt="Fulbo" className={styles.logo} src="/fulbo_logo.png" />
        <p className={styles.eyebrow}>Guia paso a paso</p>
        <h1>Personaliza la imagen de tu jugador</h1>
        <p className={styles.lead}>
          Unite al torneo, encontra tu jugador y elegi si queres mostrar tu foto o el escudo de tu equipo.
        </p>
        <div className={styles.summary} aria-label="Resumen de la guia">
          <span>6 pasos simples</span>
          <span>Necesitas una cuenta</span>
          <span>Necesitas un codigo de torneo</span>
        </div>
      </header>

      <ol className={styles.steps}>
        {GUIDE_STEPS.map((step, index) => (
          <li className={styles.step} key={step.title}>
            <div aria-hidden="true" className={styles.stepNumber}>
              {String(index + 1).padStart(2, '0')}
            </div>
            <article className={styles.stepCard}>
              <div className={styles.stepCopy}>
                <p className={styles.stepLabel}>Paso {index + 1}</p>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
                {'note' in step ? <aside className={styles.note}>{step.note}</aside> : null}
              </div>
              <figure className={styles.screenshotFrame}>
                <img alt={step.imageAlt} loading="lazy" src={step.imageUrl} />
              </figure>
            </article>
          </li>
        ))}
      </ol>

      <footer className={styles.footer}>
        <p>Listo. Tu nueva imagen se usara en las pantallas del torneo.</p>
      </footer>
    </main>
  );
}
