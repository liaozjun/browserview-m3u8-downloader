import mitt from 'mitt'

type Events = {
  foo: string;
  bar?: number;
};

const Emitter = mitt<Events>(); 
export default Emitter;